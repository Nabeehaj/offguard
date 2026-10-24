import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

import { config, CLIENT_DIST, SNAPSHOT_DIR } from './config.js';
import { route } from './geo.js';
import { sensors, sensorById } from './sensors.js';
import { eventsFile, addEvent, saveSnapshot } from './store.js';
import { generateHistory } from './seed.js';
import { computeStats, sensorsWithStatus, alertState } from './stats.js';
import { geminiEnabled, identifyAnimal, writeReport } from './gemini.js';
import { vapidPublicKey, subscribe, unsubscribe, findSubscription, notifyCommuters, sendTest } from './push.js';
import { startMqtt, mqttStatus, publishAlert, publishClear, onUnitMotion } from './mqtt.js';

if (!eventsFile.exists()) {
  eventsFile.set(generateHistory());
  console.log(`[seed] created ${eventsFile.get().length} simulated events`);
}

const app = express();
const http = createServer(app);
const io = new Server(http, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use('/snapshots', express.static(SNAPSHOT_DIR, { maxAge: '1h' }));

const now = () => Date.now();
const events = () => eventsFile.get();

function driverAlertText({ species, count }, sensor) {
  const who = count > 1 ? `${count} × ${species}` : species;
  return `${who} near Exit ${sensor.exit} (${sensor.name}). Slow down and watch the shoulder.`;
}

/**
 * The whole pipeline for one detection: identify, store, then fan out to the
 * dashboards (Socket.IO), the roadside unit (MQTT) and commuters (web push).
 */
async function recordDetection({ sensorId, cocoLabel = 'animal', confidence = null, image = null, source }) {
  const sensor = sensorById.get(sensorId);
  if (!sensor) throw Object.assign(new Error(`Unknown sensor ${sensorId}`), { status: 400 });

  const id = randomUUID();
  const ident = image
    ? await identifyAnimal(image, cocoLabel)
    : { isAnimal: true, species: 'White-tailed deer', speciesKey: 'deer', count: 1, behavior: 'crossing toward the road', ai: false };

  if (!ident.isAnimal) return { rejected: true, reason: 'Gemini found no animal in the frame', ident };

  const event = {
    id,
    ts: now(),
    sensorId,
    species: ident.species,
    speciesKey: ident.speciesKey,
    count: ident.count,
    behavior: ident.behavior,
    confidence,
    cocoLabel,
    aiVerified: ident.ai,
    aiModel: ident.aiModel,
    aiError: ident.aiError,
    snapshot: image ? saveSnapshot(id, image) : null,
    source,
  };
  event.driverAlert = driverAlertText(event, sensor);
  addEvent(event);

  const roadsideUnit = publishAlert(event, sensor);
  io.emit('detection', { event, sensor });
  const notified = await notifyCommuters(event, sensor);
  console.log(`[detect] ${event.species} x${event.count} @ Exit ${sensor.exit} (${source}) -> push ${notified}, unit ${roadsideUnit}`);
  return { event, sensor, delivered: { push: notified, roadsideUnit, dashboards: io.engine.clientsCount } };
}

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  });

app.get('/api/health', (req, res) =>
  res.json({ ok: true, gemini: { enabled: geminiEnabled, model: config.geminiModel }, mqtt: mqttStatus(), alertWindowMs: config.alertWindowMs })
);

app.get('/api/route', (req, res) => res.json({ name: route.name, lengthMiles: route.lengthMiles, coords: route.coords, sensors }));

app.get('/api/sensors', (req, res) => res.json(sensorsWithStatus(events())));

app.get('/api/events', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const since = Number(req.query.since) || 0;
  res.json(events().filter((e) => e.ts >= since).slice(-limit).reverse());
});

app.get('/api/stats', (req, res) => res.json(computeStats(events())));

app.post(
  '/api/detections',
  wrap(async (req, res) => {
    const { sensorId, cocoLabel, confidence, image } = req.body ?? {};
    const base64 = typeof image === 'string' ? image.replace(/^data:image\/\w+;base64,/, '') : null;
    res.json(await recordDetection({ sensorId, cocoLabel, confidence, image: base64, source: 'camera' }));
  })
);

// Demo backup: fire a detection without a camera.
app.post(
  '/api/simulate',
  wrap(async (req, res) => {
    const sensorId = req.body?.sensorId || 'exit-64';
    res.json(await recordDetection({ sensorId, source: 'manual' }));
  })
);

app.post('/api/clear', (req, res) => {
  alertState.clearedAt = now();
  publishClear();
  io.emit('cleared', { at: alertState.clearedAt });
  res.json({ ok: true });
});

let reportCache = null;
app.get(
  '/api/report',
  wrap(async (req, res) => {
    const fresh = req.query.refresh === '1';
    if (!reportCache || fresh || now() - reportCache.generatedAt > 10 * 60 * 1000) {
      const stats = computeStats(events());
      reportCache = { ...(await writeReport(stats)), generatedAt: now(), stats };
    }
    res.json(reportCache);
  })
);

app.get('/api/push/public-key', (req, res) => res.json({ publicKey: vapidPublicKey }));

app.post('/api/push/subscribe', (req, res) => {
  const { subscription, fromExit, toExit, label } = req.body ?? {};
  if (!subscription?.endpoint || !Number.isFinite(fromExit) || !Number.isFinite(toExit)) {
    return res.status(400).json({ error: 'subscription, fromExit and toExit are required' });
  }
  res.json(subscribe({ subscription, fromExit, toExit, label }));
});

app.post('/api/push/status', (req, res) => res.json(findSubscription(req.body?.endpoint) ?? null));
app.post('/api/push/unsubscribe', (req, res) => {
  unsubscribe(req.body?.endpoint);
  res.json({ ok: true });
});
app.post('/api/push/test', wrap(async (req, res) => res.json({ sent: await sendTest(req.body?.endpoint) })));

// Production: serve the built web app from the same port (used for tunnels/deploys).
if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/(api|socket\.io|snapshots)).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

io.on('connection', (socket) => socket.emit('hello', { sensors: sensorsWithStatus(events()) }));

// The Wokwi unit's own motion sensor counts as a detection at its exit.
onUnitMotion((msg) => {
  const sensorId = sensorById.has(msg.sensorId) ? msg.sensorId : 'exit-64';
  recordDetection({ sensorId, cocoLabel: 'motion', source: 'roadside-unit' }).catch((e) => console.warn(e.message));
});

startMqtt();
http.listen(config.port, () => {
  console.log(`OffGuard server on http://localhost:${config.port}`);
  console.log(`Gemini: ${geminiEnabled ? config.geminiModel : 'OFF (set GEMINI_API_KEY in .env)'}`);
});
