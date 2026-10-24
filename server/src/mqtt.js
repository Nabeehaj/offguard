import mqtt from 'mqtt';
import { config } from './config.js';

// Bridge to the Wokwi roadside unit through a public MQTT broker.
//   <prefix>/alert   server -> unit: flash the sign, drop the gate
//   <prefix>/clear   server -> unit: all clear
//   <prefix>/motion  unit -> server: the unit's own motion sensor tripped
export const topics = {
  alert: `${config.mqttPrefix}/alert`,
  clear: `${config.mqttPrefix}/clear`,
  motion: `${config.mqttPrefix}/motion`,
};

let client = null;
let connected = false;
const motionHandlers = [];

export function startMqtt() {
  client = mqtt.connect(config.mqttUrl, {
    clientId: `offguard-server-${Math.random().toString(16).slice(2, 8)}`,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });
  client.on('connect', () => {
    connected = true;
    client.subscribe(topics.motion);
    console.log(`[mqtt] connected to ${config.mqttUrl}, topics ${config.mqttPrefix}/*`);
  });
  client.on('close', () => (connected = false));
  client.on('error', (err) => console.warn('[mqtt]', err.message));
  client.on('message', (topic, buf) => {
    if (topic !== topics.motion) return;
    let msg = {};
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      /* plain-text ping is fine */
    }
    motionHandlers.forEach((fn) => fn(msg));
  });
}

export const mqttStatus = () => ({ connected, url: config.mqttUrl, prefix: config.mqttPrefix });

export function onUnitMotion(fn) {
  motionHandlers.push(fn);
}

export function publishAlert(event, sensor) {
  if (!connected) return false;
  // Kept short: the unit's LCD is 16x2.
  client.publish(
    topics.alert,
    JSON.stringify({
      exit: sensor.exit,
      species: event.speciesKey,
      count: event.count,
      line1: `EXIT ${sensor.exit} ${event.speciesKey.toUpperCase()}`.slice(0, 16),
      line2: 'SLOW DOWN NOW'.slice(0, 16),
    })
  );
  return true;
}

export function publishClear() {
  if (connected) client.publish(topics.clear, '{}');
}
