import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Car, Download, Gauge as GaugeIcon, Locate, Navigation, Pause, Play, Send, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { useLive } from '../lib/live.jsx';
import { useDrive, useHazardAlert } from '../lib/drive.js';
import { pushSupport, currentSubscription, subscribeCommute, unsubscribeCommute } from '../lib/push.js';
import { api } from '../lib/api.js';
import { speak } from '../lib/speech.js';
import { speciesEmoji } from '../lib/format.js';
import { PhoneFrame } from '../components/PhoneFrame.jsx';
import { SensorMap } from '../components/SensorMap.jsx';
import { AlertTakeover } from '../components/AlertTakeover.jsx';
import { Logo } from '../components/Logo.jsx';

export function Driver() {
  const [tab, setTab] = useState('drive');
  return (
    <main className="px-0 py-0 sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_400px]">
        <aside className="hidden lg:block">
          <p className="font-mono text-xs tracking-widest text-brass">FOR DRIVERS · INSTALLS FROM THE BROWSER</p>
          <h1 className="mt-1 font-display text-5xl leading-[0.95] font-black text-bone uppercase">
            Know before
            <br />
            you're there.
          </h1>
          <ul className="mt-6 space-y-4 text-steel-300">
            <Feature icon={Bell} title="Commute alerts over any map app">Pick your stretch of the LIE. When a sensor spots an animal on it, your phone buzzes even while you're in Google Maps or Waze.</Feature>
            <Feature icon={Navigation} title="Driver Mode">Open OffGuard on the road and it calls out wildlife ahead with a voice alert and distance.</Feature>
            <Feature icon={Car} title="Car Display">A big, glanceable landscape view for a dash-mounted phone or tablet.</Feature>
            <Feature icon={ShieldCheck} title="No account, no tracking">Commute alerts don't need your location. Driver Mode uses GPS only on your device.</Feature>
          </ul>
        </aside>

        <PhoneFrame>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-steel-800 px-4 pt-3 pb-2 sm:pt-11">
              <Logo />
              <Link to="/car" className="chip hover:border-amber">
                <Car className="size-3.5" /> CAR VIEW
              </Link>
            </div>
            <div className="relative min-h-0 flex-1">{tab === 'drive' ? <DriveTab /> : <AlertsTab />}</div>
            <nav className="grid grid-cols-2 border-t border-steel-800 bg-steel-900 pb-[env(safe-area-inset-bottom)]">
              {[
                ['drive', Navigation, 'Drive'],
                ['alerts', Bell, 'Commute alerts'],
              ].map(([id, Icon, label]) => (
                <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold tracking-wider uppercase ${tab === id ? 'text-amber' : 'text-steel-400'}`}>
                  <Icon className="size-5" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </PhoneFrame>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-steel-600 bg-steel-800">
        <Icon className="size-5 text-amber" />
      </span>
      <span>
        <span className="block font-display text-lg font-bold tracking-wide text-bone uppercase">{title}</span>
        <span className="text-sm">{children}</span>
      </span>
    </li>
  );
}

function DriveTab() {
  const { route, sensors } = useLive();
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState('sim');
  const [voice, setVoice] = useState(true);
  const drive = useDrive(route, sensors, { mode, running });
  const { alert, dismiss } = useHazardAlert(running || mode === 'gps' ? drive.hazards : [], { voice });
  const next = drive.hazards[0];

  const start = () => {
    setRunning(true);
    if (voice) speak('OffGuard driver mode on. Watching I 4 95 East.', { force: true });
  };

  return (
    <div className="absolute inset-0">
      <SensorMap className="h-full w-full" route={route} sensors={sensors} car={drive.position} followCar={running || mode === 'gps'} />

      {/* top status card */}
      <div className="absolute inset-x-3 top-3 z-[1000]">
        {next ? (
          <div className="rounded-xl border border-signal/60 bg-steel-950/90 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{speciesEmoji(next.event.speciesKey)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-extrabold text-signal uppercase">{next.event.species} ahead</div>
                <div className="text-xs text-steel-300">
                  Exit {next.sensor.exit} · {next.sensor.name}
                </div>
              </div>
              <div className="led led-red text-right text-xl font-bold">{next.milesAhead.toFixed(1)} mi</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-steel-700 bg-steel-950/85 p-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-7 text-go" />
              <div className="flex-1">
                <div className="font-display text-lg font-extrabold text-bone uppercase">Road clear</div>
                <div className="text-xs text-steel-400">
                  {drive.nextSensor ? `Next sensor: Exit ${drive.nextSensor.exit}, ${(drive.nextSensor.mile - drive.mile).toFixed(1)} mi` : 'End of monitored corridor'}
                </div>
              </div>
            </div>
          </div>
        )}
        {drive.gpsError && mode === 'gps' && <p className="mt-2 rounded-lg bg-steel-950/90 p-2 text-xs text-amber">{drive.gpsError}</p>}
      </div>

      {/* bottom controls */}
      <div className="absolute inset-x-3 bottom-3 z-[1000] rounded-xl border border-steel-700 bg-steel-950/90 p-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between font-mono text-xs text-steel-400">
          <span className="flex items-center gap-1">
            <GaugeIcon className="size-3.5" /> I-495 E · MILE {drive.mile.toFixed(1)}
          </span>
          <span>{mode === 'sim' ? 'SIMULATED DRIVE' : 'LIVE GPS'}</span>
        </div>
        <div className="flex gap-2">
          {mode === 'sim' &&
            (running ? (
              <button className="btn-steel flex-1" onClick={() => setRunning(false)}>
                <Pause className="size-4" /> Pause
              </button>
            ) : (
              <button className="btn-amber flex-1" onClick={start}>
                <Play className="size-4" /> Start drive
              </button>
            ))}
          <button className={`btn-steel ${mode === 'gps' ? 'flex-1 border-amber text-amber' : ''}`} onClick={() => setMode((m) => (m === 'sim' ? 'gps' : 'sim'))} aria-label="Toggle GPS">
            <Locate className="size-4" />
            {mode === 'gps' && 'Using GPS'}
          </button>
          <button className="btn-steel" onClick={() => setVoice((v) => !v)} aria-label="Toggle voice">
            {voice ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
        </div>
      </div>

      <AlertTakeover hazard={alert} onDismiss={dismiss} />
    </div>
  );
}

function AlertsTab() {
  const { sensors } = useLive();
  const exits = sensors.map((s) => s.exit);
  const [from, setFrom] = useState(57);
  const [to, setTo] = useState(70);
  const [sub, setSub] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [installEvt, setInstallEvt] = useState(null);
  const support = pushSupport();
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    currentSubscription()
      .then((s) => (s ? api.post('/api/push/status', { endpoint: s.endpoint }) : null))
      .then((entry) => {
        if (entry) {
          setSub(entry);
          setFrom(entry.fromExit);
          setTo(entry.toExit);
        }
      })
      .catch(() => {});
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const run = (fn) => async () => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const enable = run(async () => {
    const entry = await subscribeCommute({ fromExit: from, toExit: to });
    setSub(entry);
    setMsg({ text: `Alerts on for Exits ${entry.fromExit} to ${entry.toExit}.` });
  });
  const disable = run(async () => {
    await unsubscribeCommute();
    setSub(null);
    setMsg({ text: 'Alerts turned off.' });
  });
  const test = run(async () => {
    const s = await currentSubscription();
    await api.post('/api/push/test', { endpoint: s.endpoint });
    setMsg({ text: 'Test alert sent. Check your notifications.' });
  });

  const covered = sensors.filter((s) => s.exit >= Math.min(from, to) && s.exit <= Math.max(from, to));

  return (
    <div className="absolute inset-0 overflow-y-auto p-4">
      <h2 className="font-display text-2xl font-black text-bone uppercase">Commute alerts</h2>
      <p className="mt-1 text-sm text-steel-400">Get a notification when wildlife is spotted on your stretch of I-495 East. It works while you're using Google Maps, Waze or any other app.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          ['From exit', from, setFrom],
          ['To exit', to, setTo],
        ].map(([label, value, set]) => (
          <label key={label} className="block">
            <span className="mb-1 block text-xs text-steel-400">{label}</span>
            <select className="field font-mono" value={value} onChange={(e) => set(Number(e.target.value))}>
              {exits.map((x) => (
                <option key={x} value={x}>
                  Exit {x}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {covered.map((s) => (
          <span key={s.id} className={`chip ${s.active ? 'border-signal/60 text-[#ffb4ae]' : ''}`}>
            {s.exit} {s.name}
          </span>
        ))}
      </div>

      {!support.ok ? (
        <p className="mt-4 rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm text-amber">{support.reason}</p>
      ) : (
        <div className="mt-4 grid gap-2">
          <button className="btn-signal py-3.5" onClick={enable} disabled={busy}>
            <Bell className="size-5" /> {sub ? 'Update my commute' : 'Alert me on this commute'}
          </button>
          {sub && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-steel" onClick={test} disabled={busy}>
                <Send className="size-4" /> Test
              </button>
              <button className="btn-steel" onClick={disable} disabled={busy}>
                <BellOff className="size-4" /> Turn off
              </button>
            </div>
          )}
        </div>
      )}
      {msg && <p className={`mt-3 text-sm ${msg.error ? 'text-signal' : 'text-go'}`}>{msg.text}</p>}

      {sub && (
        <div className="mt-4 rounded-xl border border-go/40 bg-go/10 p-3 text-sm text-steel-200">
          <ShieldCheck className="mr-1 inline size-4 text-go" /> Watching Exits {sub.fromExit} to {sub.toExit}. You can close the app.
        </div>
      )}

      {!standalone && (
        <div className="mt-6 rounded-xl border border-steel-700 bg-steel-900 p-3">
          <div className="font-display font-bold tracking-wide text-bone uppercase">Install OffGuard</div>
          <p className="mt-1 text-xs text-steel-400">Add it to your home screen so alerts arrive reliably. On iPhone: Share → Add to Home Screen.</p>
          {installEvt && (
            <button className="btn-amber mt-3 w-full" onClick={() => installEvt.prompt().then(() => setInstallEvt(null))}>
              <Download className="size-4" /> Install app
            </button>
          )}
        </div>
      )}
    </div>
  );
}
