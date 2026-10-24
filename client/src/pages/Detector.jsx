import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ImageUp, Loader2, Sparkles, Zap, Radio, Smartphone, MonitorSmartphone } from 'lucide-react';
import { useLive } from '../lib/live.jsx';
import { api } from '../lib/api.js';
import { speciesEmoji, clock } from '../lib/format.js';
import { Panel } from '../components/Panel.jsx';

// COCO-SSD classes that count as "animal on the road". It has no deer class,
// so large mammals act as the trigger and Gemini names the real species.
const ANIMALS = new Set(['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe']);
const MIN_SCORE = 0.6;
const HOLD_MS = 1000;
const COOLDOWN_MS = 10000;

function captureFrame(source, width = 640) {
  const w = source.videoWidth || source.naturalWidth;
  const h = source.videoHeight || source.naturalHeight;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = Math.round((h / w) * width);
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

export function Detector() {
  const { sensors } = useLive();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const state = useRef({ holdStart: 0, lastSent: 0, sending: false });

  const [sensorId, setSensorId] = useState('exit-64');
  const [acceptToys, setAcceptToys] = useState(true);
  const [modelStatus, setModelStatus] = useState('loading');
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState(null);
  const [seen, setSeen] = useState(null); // best current detection
  const [hold, setHold] = useState(0); // 0..1
  const [cooldown, setCooldown] = useState(0); // 0..1 remaining
  const [sending, setSending] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [log, setLog] = useState([]);

  const sensorRef = useRef(sensorId);
  sensorRef.current = sensorId;
  const toysRef = useRef(acceptToys);
  toysRef.current = acceptToys;

  // Load TensorFlow.js + COCO-SSD lazily so other pages stay light.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await import('@tensorflow/tfjs');
        const coco = await import('@tensorflow-models/coco-ssd');
        const model = await coco.load({ base: 'mobilenet_v2' });
        if (!cancelled) {
          modelRef.current = model;
          setModelStatus('ready');
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setModelStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async (image, cocoLabel, confidence) => {
    state.current.sending = true;
    setSending(true);
    try {
      const res = await api.post('/api/detections', { sensorId: sensorRef.current, cocoLabel, confidence, image });
      setVerdict({ ...res, image, cocoLabel, at: Date.now() });
      if (res.event) setLog((l) => [res.event, ...l].slice(0, 6));
    } catch (err) {
      setVerdict({ error: err.message, image, cocoLabel, at: Date.now() });
    } finally {
      state.current.sending = false;
      state.current.lastSent = Date.now();
      setSending(false);
    }
  }, []);

  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCamOn(true);
    } catch (err) {
      setCamError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : err.message);
    }
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
    setSeen(null);
    setHold(0);
  };
  useEffect(() => stopCamera, []);

  // Detection loop: draw boxes, apply the hold + cooldown rules, send.
  useEffect(() => {
    if (!camOn || modelStatus !== 'ready') return;
    let raf;
    let busy = false;
    const loop = async () => {
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (busy || !video || video.readyState < 2) return;
      busy = true;
      const preds = await modelRef.current.detect(video, 10, 0.35);
      busy = false;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isTrigger = (p) => ANIMALS.has(p.class) || (toysRef.current && p.class === 'teddy bear');
      let best = null;
      for (const p of preds) {
        const trig = isTrigger(p);
        const [x, y, w, h] = p.bbox;
        const color = trig ? (p.score >= MIN_SCORE ? '#ff3b30' : '#ffb020') : '#6d7887';
        ctx.lineWidth = trig ? 4 : 2;
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, w, h);
        const label = `${p.class.toUpperCase()} ${Math.round(p.score * 100)}%`;
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        const tw = ctx.measureText(label).width + 12;
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - 26), tw, 26);
        ctx.fillStyle = '#0b0d10';
        ctx.fillText(label, x + 6, Math.max(19, y - 7));
        if (trig && (!best || p.score > best.score)) best = p;
      }
      setSeen(best);

      const now = Date.now();
      const s = state.current;
      const coolLeft = Math.max(0, COOLDOWN_MS - (now - s.lastSent));
      setCooldown(s.lastSent ? coolLeft / COOLDOWN_MS : 0);

      if (best && best.score >= MIN_SCORE) {
        if (!s.holdStart) s.holdStart = now;
        const held = now - s.holdStart;
        setHold(Math.min(1, held / HOLD_MS));
        if (held >= HOLD_MS && !coolLeft && !s.sending) {
          s.holdStart = 0;
          send(captureFrame(video), best.class, +best.score.toFixed(2));
        }
      } else {
        s.holdStart = 0;
        setHold(0);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camOn, modelStatus, send]);

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => send(captureFrame(img), 'upload', null);
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  const sensor = sensors.find((s) => s.id === sensorId);
  const status = sending ? 'ANALYZING' : cooldown > 0 ? 'COOLDOWN' : seen && seen.score >= MIN_SCORE ? 'LOCKING ON' : camOn ? 'SCANNING' : 'STANDBY';

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
      <div className="mb-4">
        <p className="font-mono text-xs tracking-widest text-brass">ROADSIDE CAMERA · TENSORFLOW.JS COCO-SSD + GEMINI</p>
        <h1 className="font-display text-4xl font-black tracking-wide text-bone uppercase">Detector</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Camera feed" bodyClass="p-0" right={<span className={`chip ${status === 'LOCKING ON' || status === 'ANALYZING' ? 'border-signal/60 text-[#ffb4ae]' : ''}`}>{status}</span>}>
          <div className="relative aspect-video w-full overflow-hidden rounded-b-xl bg-black">
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" playsInline muted />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />

            {/* HUD */}
            <div className="pointer-events-none absolute inset-3">
              {['top-0 left-0 border-t-4 border-l-4', 'top-0 right-0 border-t-4 border-r-4', 'bottom-0 left-0 border-b-4 border-l-4', 'right-0 bottom-0 border-r-4 border-b-4'].map((c) => (
                <span key={c} className={`absolute size-8 border-amber/80 ${c}`} />
              ))}
              <div className="absolute top-2 left-10 flex items-center gap-2 font-mono text-xs text-bone">
                {camOn && <span className="size-2 animate-flash-a rounded-full bg-signal" />}
                CAM-{sensor?.exit ?? '--'} · {sensor?.name?.toUpperCase()}
              </div>
              {seen && (
                <div className="absolute right-10 bottom-2 font-mono text-xs text-bone">
                  {seen.class.toUpperCase()} {Math.round(seen.score * 100)}%
                </div>
              )}
            </div>

            {!camOn && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <div>
                  <Camera className="mx-auto mb-3 size-12 text-steel-500" />
                  <p className="mb-4 text-steel-300">Point the camera at the road. For the demo, hold up a deer photo or toy.</p>
                  <button className="btn-amber" onClick={startCamera} disabled={modelStatus === 'loading'}>
                    {modelStatus === 'loading' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                    {modelStatus === 'loading' ? 'Loading AI model…' : 'Start camera'}
                  </button>
                  {modelStatus === 'error' && <p className="mt-3 text-sm text-signal">Couldn't load the detection model. Check your internet connection.</p>}
                  {camError && <p className="mt-3 text-sm text-signal">{camError}</p>}
                </div>
              </div>
            )}

            {sending && (
              <div className="absolute inset-0 grid place-items-center bg-black/50">
                <span className="chip border-brass/60 px-3 py-1.5 text-sm text-brass">
                  <Sparkles className="size-4 animate-pulse" /> Gemini is identifying the animal…
                </span>
              </div>
            )}
          </div>

          {/* hold / cooldown meters */}
          <div className="grid grid-cols-2 gap-4 px-6 py-3">
            <Meter label="Lock-on (1 s)" value={hold} color="bg-signal" />
            <Meter label="Cooldown (10 s)" value={cooldown} color="bg-steel-400" />
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Panel title="Unit settings">
            <label className="mb-1 block text-xs text-steel-400">This camera's location</label>
            <select className="field" value={sensorId} onChange={(e) => setSensorId(e.target.value)}>
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>
                  Exit {s.exit} · {s.name} ({s.near})
                </option>
              ))}
            </select>
            <label className="mt-3 flex items-center gap-2 text-sm text-steel-300">
              <input type="checkbox" checked={acceptToys} onChange={(e) => setAcceptToys(e.target.checked)} className="accent-amber" />
              Demo mode: also trigger on toy animals
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {camOn ? (
                <button className="btn-steel" onClick={stopCamera}>
                  <CameraOff className="size-4" /> Stop
                </button>
              ) : null}
              <label className="btn-steel cursor-pointer">
                <ImageUp className="size-4" /> Photo
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
              </label>
              <button className="btn-steel" onClick={() => api.post('/api/simulate', { sensorId })}>
                <Zap className="size-4 text-amber" /> Simulate
              </button>
            </div>
          </Panel>

          <Panel title="Last verdict" right={verdict?.event?.aiVerified && <span className="chip border-brass/50 text-brass"><Sparkles className="size-3" /> GEMINI</span>}>
            {!verdict && <p className="text-sm text-steel-400">Waiting for an animal. Rules: ≥{MIN_SCORE * 100}% confidence, held {HOLD_MS / 1000} s, then a {COOLDOWN_MS / 1000} s cooldown.</p>}
            {verdict?.error && <p className="text-sm text-signal">{verdict.error}</p>}
            {verdict?.rejected && (
              <div className="flex gap-3">
                <img src={verdict.image} alt="" className="size-20 rounded-md object-cover" />
                <p className="text-sm text-steel-300">
                  Gemini found no animal in this frame (COCO said “{verdict.cocoLabel}”). No alert sent.
                </p>
              </div>
            )}
            {verdict?.event && (
              <div className="animate-rise">
                <div className="flex gap-3">
                  <img src={verdict.image} alt="Detection snapshot" className="size-24 rounded-md border border-steel-600 object-cover" />
                  <div className="min-w-0">
                    <div className="font-display text-2xl leading-tight font-extrabold text-bone uppercase">
                      {speciesEmoji(verdict.event.speciesKey)} {verdict.event.count > 1 ? `${verdict.event.count} × ` : ''}
                      {verdict.event.species}
                    </div>
                    <p className="text-sm text-steel-300">{verdict.event.behavior}</p>
                    <p className="mt-1 font-mono text-[11px] text-steel-500">
                      COCO: {verdict.cocoLabel} {verdict.event.confidence ? `${Math.round(verdict.event.confidence * 100)}%` : ''}
                      {verdict.event.aiError && ' · Gemini unavailable, used COCO label'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Delivered icon={MonitorSmartphone} label="Dashboards" value={verdict.delivered.dashboards} />
                  <Delivered icon={Radio} label="Roadside unit" value={verdict.delivered.roadsideUnit ? 'SENT' : 'OFF'} />
                  <Delivered icon={Smartphone} label="Phones" value={verdict.delivered.push} />
                </div>
              </div>
            )}
          </Panel>

          {log.length > 0 && (
            <Panel title="This session">
              <ul className="space-y-1.5 text-sm">
                {log.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {speciesEmoji(e.speciesKey)} {e.species}
                    </span>
                    <span className="font-mono text-xs text-steel-400">{clock(e.ts)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </main>
  );
}

function Meter({ label, value, color }) {
  return (
    <div>
      <div className="mb-1 text-[11px] tracking-wider text-steel-400 uppercase">{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-steel-900">
        <div className={`h-full ${color} transition-[width] duration-100`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function Delivered({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-steel-700 bg-steel-900 px-2 py-2">
      <Icon className="mx-auto size-4 text-steel-400" />
      <div className="led mt-1 text-sm font-bold">{value}</div>
      <div className="text-[10px] tracking-wider text-steel-500 uppercase">{label}</div>
    </div>
  );
}
