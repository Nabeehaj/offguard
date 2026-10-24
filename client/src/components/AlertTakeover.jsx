import { X } from 'lucide-react';
import { speciesEmoji } from '../lib/format.js';

/** Full-screen driver alert. `variant="car"` is the big landscape version. */
export function AlertTakeover({ hazard, onDismiss, variant = 'phone' }) {
  if (!hazard) return null;
  const { sensor, event, milesAhead } = hazard;
  const car = variant === 'car';
  return (
    <div className="absolute inset-0 z-[1100] flex animate-rise flex-col overflow-hidden bg-steel-950/95 backdrop-blur-sm">
      <div className="hazard h-3 shrink-0" />
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="pointer-events-none absolute inset-0 animate-flash-a bg-signal/10" />
        <div className="flex items-center gap-6">
          <span className="size-6 animate-flash-a rounded-full bg-signal shadow-[0_0_30px_#ff3b30]" />
          <span className={car ? 'text-[140px] leading-none' : 'text-7xl'}>{speciesEmoji(event.speciesKey)}</span>
          <span className="size-6 animate-flash-b rounded-full bg-signal shadow-[0_0_30px_#ff3b30]" />
        </div>
        <div className={`font-stencil font-black tracking-wider text-signal ${car ? 'text-8xl' : 'text-5xl'}`}>SLOW DOWN</div>
        <div className={`font-display font-extrabold tracking-wide text-bone uppercase ${car ? 'text-5xl' : 'text-2xl'}`}>
          {event.count > 1 ? `${event.count} × ` : ''}
          {event.species}
        </div>
        <div className={`led ${car ? 'text-4xl' : 'text-xl'}`}>
          {milesAhead != null ? `${milesAhead.toFixed(1)} MI AHEAD` : 'ON YOUR ROUTE'} · EXIT {sensor.exit}
        </div>
        <p className={`max-w-md text-steel-300 ${car ? 'text-xl' : 'text-sm'}`}>
          {sensor.name}, near {sensor.near}. {event.behavior}.
        </p>
      </div>
      <button onClick={onDismiss} className={`btn-steel m-4 shrink-0 ${car ? 'py-5 text-2xl' : ''}`}>
        <X className="size-5" /> Got it
      </button>
      <div className="hazard h-3 shrink-0" />
    </div>
  );
}
