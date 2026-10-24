import { Sparkles, Camera, Radio, Hand } from 'lucide-react';
import { speciesEmoji, timeAgo, clock } from '../lib/format.js';
import { useNow } from '../lib/live.jsx';

const SOURCE = {
  camera: { icon: Camera, label: 'Camera' },
  'roadside-unit': { icon: Radio, label: 'Roadside unit' },
  manual: { icon: Hand, label: 'Manual' },
  simulated: { icon: null, label: 'Simulated' },
};

export function EventFeed({ events, sensors, limit = 30, onSelect }) {
  const now = useNow();
  const byId = new Map(sensors.map((s) => [s.id, s]));
  if (!events.length) return <p className="p-4 text-sm text-steel-400">No crossings yet.</p>;
  return (
    <ul className="divide-y divide-steel-700/60">
      {events.slice(0, limit).map((e) => {
        const s = byId.get(e.sensorId);
        const fresh = now - e.ts < 15 * 60 * 1000;
        const src = SOURCE[e.source] ?? SOURCE.simulated;
        return (
          <li key={e.id} className="animate-rise">
            <button onClick={() => onSelect?.(e)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-steel-800/60">
              {e.snapshot ? (
                <img src={e.snapshot} alt="" className="size-11 shrink-0 rounded-md border border-steel-600 object-cover" />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-md border border-steel-700 bg-steel-900 text-2xl">{speciesEmoji(e.speciesKey)}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate font-semibold text-steel-100">
                  {e.count > 1 && <span className="text-amber">{e.count}×</span>}
                  {e.species}
                  {e.aiVerified && <Sparkles className="size-3.5 shrink-0 text-brass" aria-label="Verified by Gemini" />}
                </span>
                <span className="block truncate text-xs text-steel-400">
                  Exit {s?.exit} · {s?.name} · {e.behavior}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block font-mono text-xs ${fresh ? 'led-red led' : 'text-steel-300'}`}>{fresh ? timeAgo(e.ts, now) : clock(e.ts)}</span>
                <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] tracking-wider text-steel-500 uppercase">
                  {src.icon && <src.icon className="size-3" />}
                  {src.label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
