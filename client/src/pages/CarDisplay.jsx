import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Maximize, Pause, Play, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { useLive } from '../lib/live.jsx';
import { useDrive, useHazardAlert } from '../lib/drive.js';
import { speak } from '../lib/speech.js';
import { speciesEmoji } from '../lib/format.js';
import { SensorMap } from '../components/SensorMap.jsx';
import { AlertTakeover } from '../components/AlertTakeover.jsx';
import { Crossbuck } from '../components/Logo.jsx';

/** Glanceable landscape heads-up view for a dash-mounted phone or tablet. */
export function CarDisplay() {
  const { route, sensors, connected } = useLive();
  const [running, setRunning] = useState(false);
  const [voice, setVoice] = useState(true);
  const [clock, setClock] = useState(new Date());
  const drive = useDrive(route, sensors, { running });
  const { alert, dismiss } = useHazardAlert(running ? drive.hazards : [], { voice });
  const next = drive.hazards[0];

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const start = () => {
    setRunning(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    if (voice) speak('Car display on.', { force: true });
  };

  return (
    <main className="relative grid h-[100dvh] grid-cols-[minmax(320px,42%)_1fr] overflow-hidden bg-steel-950 portrait:grid-cols-1 portrait:grid-rows-[1fr_45%]">
      {/* left: status */}
      <section className="flex flex-col border-r border-steel-800 p-6 portrait:border-r-0 portrait:border-b">
        <div className="flex items-center justify-between">
          <Link to="/drive" className="btn-steel px-3" aria-label="Back">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="font-mono text-3xl text-steel-200">{clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
          <span className={`chip ${connected ? '' : 'text-signal'}`}>{connected ? 'LIVE' : 'NO SIGNAL'}</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {next ? (
            <>
              <Crossbuck className="size-28" />
              <div className="mt-3 text-7xl">{speciesEmoji(next.event.speciesKey)}</div>
              <div className="mt-2 font-stencil text-6xl font-black text-signal">{next.milesAhead.toFixed(1)} MI</div>
              <div className="font-display text-3xl font-extrabold text-bone uppercase">{next.event.species} ahead</div>
              <div className="led mt-2 text-xl">EXIT {next.sensor.exit} · {next.sensor.name.toUpperCase()}</div>
            </>
          ) : (
            <>
              <ShieldCheck className="size-28 text-go" strokeWidth={1.5} />
              <div className="mt-4 font-stencil text-6xl font-black text-bone">ALL CLEAR</div>
              <div className="led mt-3 text-xl">
                {drive.nextSensor ? `NEXT SENSOR ${(drive.nextSensor.mile - drive.mile).toFixed(1)} MI · EXIT ${drive.nextSensor.exit}` : 'END OF CORRIDOR'}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {running ? (
            <button className="btn-steel flex-1 py-4 text-xl" onClick={() => setRunning(false)}>
              <Pause className="size-6" /> Pause
            </button>
          ) : (
            <button className="btn-amber flex-1 py-4 text-xl" onClick={start}>
              <Play className="size-6" /> Start drive
            </button>
          )}
          <button className="btn-steel px-5 py-4" onClick={() => setVoice((v) => !v)} aria-label="Toggle voice">
            {voice ? <Volume2 className="size-6" /> : <VolumeX className="size-6" />}
          </button>
          <button className="btn-steel px-5 py-4" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Full screen">
            <Maximize className="size-6" />
          </button>
        </div>
        <div className="mt-3 text-center font-mono text-sm text-steel-500">I-495 EAST · MILE {drive.mile.toFixed(1)} · 65 MPH (SIMULATED)</div>
      </section>

      {/* right: map */}
      <section className="relative">
        <SensorMap className="h-full w-full" route={route} sensors={sensors} car={drive.position} followCar={running} />
      </section>

      <AlertTakeover hazard={alert} onDismiss={dismiss} variant="car" />
    </main>
  );
}
