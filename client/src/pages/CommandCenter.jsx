import { useEffect, useMemo, useState } from 'react';
import { Flame, RotateCcw, Zap } from 'lucide-react';
import { useLive, useNow } from '../lib/live.jsx';
import { api } from '../lib/api.js';
import { speciesEmoji, timeAgo, clock } from '../lib/format.js';
import { Panel } from '../components/Panel.jsx';
import { SensorMap } from '../components/SensorMap.jsx';
import { EventFeed } from '../components/EventFeed.jsx';
import { CrossingSign } from '../components/CrossingSign.jsx';
import { Gauge } from '../components/Gauge.jsx';
import { HourChart, DailyChart, SpeciesBars } from '../components/Charts.jsx';
import { chime } from '../lib/speech.js';

export function CommandCenter() {
  const { route, sensors, events, stats, onDetection, health } = useLive();
  const now = useNow(5000);
  const [heat, setHeat] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [flash, setFlash] = useState(false);

  // Flash the whole board on each live detection.
  useEffect(
    () =>
      onDetection(() => {
        setFlash(true);
        chime();
        setTimeout(() => setFlash(false), 1600);
      }),
    [onDetection]
  );

  const activeSensors = sensors.filter((s) => s.active);
  const latestActive = useMemo(
    () => activeSensors.map((s) => s.lastEvent).sort((a, b) => b.ts - a.ts)[0] ?? null,
    [activeSensors]
  );
  const latestSensor = latestActive && sensors.find((s) => s.id === latestActive.sensorId);
  const selected = sensors.find((s) => s.id === selectedId);
  const feed = selected ? events.filter((e) => e.sensorId === selected.id) : events;
  const peakHour = stats ? [...stats.byHour].sort((a, b) => b.count - a.count)[0] : null;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
      <div className={`pointer-events-none fixed inset-0 z-[999] border-[6px] border-signal transition-opacity duration-300 ${flash ? 'opacity-100' : 'opacity-0'}`} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-brass">I-495 EAST · SUFFOLK CORRIDOR · EXITS 49 TO 70</p>
          <h1 className="font-display text-4xl font-black tracking-wide text-bone uppercase">Command Center</h1>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-steel" onClick={() => api.post('/api/simulate', { sensorId: selectedId || 'exit-64' })}>
            <Zap className="size-4 text-amber" /> Test alert{selected ? ` @ ${selected.exit}` : ''}
          </button>
          <button className="btn-steel" onClick={() => api.post('/api/clear')} disabled={!activeSensors.length}>
            <RotateCcw className="size-4" /> All clear
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <Panel
            title="Corridor map"
            bodyClass="p-0"
            right={
              <>
                {selected && (
                  <button className="chip hover:border-amber" onClick={() => setSelectedId(null)}>
                    Exit {selected.exit} ✕
                  </button>
                )}
                <button className={`chip ${heat ? 'border-signal/50 text-[#ffb4ae]' : ''}`} onClick={() => setHeat((h) => !h)}>
                  <Flame className="size-3" /> Hotspots
                </button>
              </>
            }
          >
            <SensorMap
              className="h-[440px] w-full rounded-b-xl"
              route={route}
              sensors={sensors}
              hotspots={heat ? stats?.bySensor : null}
              selectedId={selectedId}
              onSelect={(s) => setSelectedId((id) => (id === s.id ? null : s.id))}
            />
          </Panel>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Panel bodyClass="p-3">
              <Gauge value={stats?.today ?? 0} max={20} label="Crossings today" />
            </Panel>
            <Panel bodyClass="p-3">
              <Gauge value={stats?.week ?? 0} max={140} label="This week" />
            </Panel>
            <Panel bodyClass="p-3">
              <Gauge value={activeSensors.length} max={sensors.length || 8} label="Active alerts" danger={0.25} />
            </Panel>
            <Panel bodyClass="p-3">
              <Gauge value={stats?.sensorsOnline ?? 0} max={sensors.length || 8} label="Sensors online" danger={2} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Crossings by hour · 30 days" right={peakHour && <span className="chip">PEAK {clock(new Date().setHours(peakHour.hour, 0))}</span>}>
              {stats && <HourChart byHour={stats.byHour} />}
              <p className="mt-1 text-xs text-steel-400">
                <span className="mr-1 inline-block size-2 rounded-sm bg-signal" /> Dawn and dusk windows
              </p>
            </Panel>
            <Panel title="Daily crossings · 14 days">{stats && <DailyChart daily={stats.daily} height={190} />}</Panel>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <Panel title="Roadside unit" right={latestSensor && <span className="chip">EXIT {latestSensor.exit}</span>}>
            <CrossingSign
              active={!!latestActive}
              message={latestActive ? `${speciesEmoji(latestActive.speciesKey)} ${latestActive.species.toUpperCase()}` : 'ALL CLEAR'}
              sub={latestActive ? `EXIT ${latestSensor?.exit} · ${timeAgo(latestActive.ts, now).toUpperCase()}` : `${sensors.length} UNITS ARMED`}
            />
          </Panel>

          <Panel title={selected ? `Feed · Exit ${selected.exit}` : 'Live feed'} bodyClass="p-0 max-h-[430px] overflow-y-auto" right={<span className="chip">{feed.length}</span>}>
            <EventFeed events={feed} sensors={sensors} />
          </Panel>

          <Panel title="Species · 30 days">{stats && <SpeciesBars bySpecies={stats.bySpecies} />}</Panel>

          <Panel title="System">
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-steel-400">Gemini species ID</dt>
              <dd className={`text-right font-mono ${health?.gemini.enabled ? 'text-go' : 'text-steel-400'}`}>{health?.gemini.enabled ? 'ONLINE' : 'OFF'}</dd>
              <dt className="text-steel-400">Roadside link (MQTT)</dt>
              <dd className={`text-right font-mono ${health?.mqtt.connected ? 'text-go' : 'text-steel-400'}`}>{health?.mqtt.connected ? 'ONLINE' : 'OFFLINE'}</dd>
              <dt className="text-steel-400">Alert window</dt>
              <dd className="text-right font-mono text-steel-200">{health ? health.alertWindowMs / 60000 : '–'} MIN</dd>
            </dl>
          </Panel>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-steel-500">History before today is simulated sample data. Live detections come from the Detector camera and roadside units.</p>
    </main>
  );
}
