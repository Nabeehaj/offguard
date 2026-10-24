import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, Brain, Camera, Car, LayoutDashboard, Radio, Smartphone } from 'lucide-react';
import { useLive, useNow } from '../lib/live.jsx';
import { speciesEmoji, timeAgo } from '../lib/format.js';
import { CrossingSign } from '../components/CrossingSign.jsx';

const STEPS = [
  { icon: Camera, title: 'Sensors watch the road', body: 'Roadside cameras along I-495 run an on-device AI model and catch animals near the lanes in real time.' },
  { icon: Brain, title: 'Gemini confirms it', body: 'A snapshot goes to Google Gemini, which names the species and counts them, so drivers get real alerts, not false alarms.' },
  { icon: Radio, title: 'The sign lights up', body: 'The roadside unit flashes its crossing signal and drops the warning gate for everyone nearby.' },
  { icon: BellRing, title: 'Your phone warns you', body: "If it's on your commute, you get a push alert over Google Maps, plus a spoken warning in Driver Mode." },
];

export function Home() {
  const { stats, sensors, events } = useLive();
  const now = useNow();
  const active = sensors.filter((s) => s.active);
  const latest = events[0];
  const latestSensor = latest && sensors.find((s) => s.id === latest.sensorId);

  return (
    <main>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-steel-800">
        <div className="mx-auto grid max-w-[1300px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-20">
          <div>
            <span className="chip border-brass/40 text-brass">
              <span className={`size-1.5 rounded-full ${active.length ? 'animate-flash-a bg-signal' : 'bg-go'}`} />
              {active.length ? `${active.length} ACTIVE ALERT${active.length > 1 ? 'S' : ''} ON I-495 NOW` : 'MONITORING I-495 EAST · EXITS 49 TO 70'}
            </span>
            <h1 className="mt-5 font-display text-6xl leading-[0.9] font-black text-bone uppercase sm:text-7xl lg:text-8xl">
              Wildlife on the road.
              <br />
              <span className="text-signal">Know before</span> you're there.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-steel-300">
              Deer crashes injure Long Island drivers every year, most at dawn and dusk. OffGuard spots animals at the roadside with AI cameras and warns you minutes before you reach them, on your phone, in your car and on the sign itself.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/drive" className="btn-signal px-6 py-3.5 text-lg">
                <Smartphone className="size-5" /> Get driver alerts
              </Link>
              <Link to="/command" className="btn-steel px-6 py-3.5 text-lg">
                <LayoutDashboard className="size-5" /> Command Center
              </Link>
            </div>
            {latest && (
              <p className="mt-6 text-sm text-steel-400">
                Latest: {speciesEmoji(latest.speciesKey)} {latest.species} at Exit {latestSensor?.exit}, {latestSensor?.name}, {timeAgo(latest.ts, now)}
              </p>
            )}
          </div>
          <div className="panel rivets mx-auto w-full max-w-md p-6">
            <CrossingSign active={active.length > 0} sub={active.length ? `EXIT ${active[0].exit} · SLOW DOWN` : 'I-495 EAST · ALL UNITS ARMED'} />
          </div>
        </div>
        <div className="hazard h-2 opacity-70" />
      </section>

      {/* live stats */}
      <section className="border-b border-steel-800 bg-steel-900/50">
        <div className="mx-auto grid max-w-[1300px] grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4">
          {[
            ['Sensors on I-495', stats?.sensorsOnline ?? '–'],
            ['Crossings today', stats?.today ?? '–'],
            ['Crossings this week', stats?.week ?? '–'],
            ['Animals, 30 days', stats?.animalsMonth ?? '–'],
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-6 text-center">
              <div className="led text-4xl font-bold">{value}</div>
              <div className="panel-title mt-1 text-[11px]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-[1300px] px-4 py-16 sm:px-6">
        <p className="font-mono text-xs tracking-widest text-brass">HOW IT WORKS</p>
        <h2 className="mt-1 font-display text-5xl font-black text-bone uppercase">From the tree line to your phone in seconds</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel rivets p-6">
              <div className="flex items-center justify-between">
                <s.icon className="size-8 text-amber" />
                <span className="font-stencil text-5xl font-black text-steel-700">{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-extrabold text-bone uppercase">{s.title}</h3>
              <p className="mt-2 text-sm text-steel-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* audiences */}
      <section className="mx-auto grid max-w-[1300px] gap-4 px-4 pb-16 sm:px-6 lg:grid-cols-2">
        <div className="panel rivets overflow-hidden">
          <div className="crossing-stripes h-2" />
          <div className="p-8">
            <p className="font-mono text-xs tracking-widest text-brass">FOR DRIVERS</p>
            <h3 className="mt-1 font-display text-4xl font-black text-bone uppercase">Your commute, watched</h3>
            <ul className="mt-4 space-y-2 text-steel-300">
              <li>• Pick your exits once. Alerts arrive over any map app.</li>
              <li>• Driver Mode reads warnings out loud with the distance.</li>
              <li>• Car Display: a giant heads-up view for your dashboard.</li>
              <li>• No account and no location tracking. Installs from the browser.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/drive" className="btn-amber">
                Open driver app <ArrowRight className="size-4" />
              </Link>
              <Link to="/car" className="btn-steel">
                <Car className="size-4" /> Car Display
              </Link>
            </div>
          </div>
        </div>
        <div className="panel rivets overflow-hidden">
          <div className="hazard h-2" />
          <div className="p-8">
            <p className="font-mono text-xs tracking-widest text-brass">FOR DOT & WILDLIFE OFFICIALS</p>
            <h3 className="mt-1 font-display text-4xl font-black text-bone uppercase">See where they cross</h3>
            <ul className="mt-4 space-y-2 text-steel-300">
              <li>• A live corridor map with hotspots and an event feed.</li>
              <li>• Time-of-day patterns to plan patrols and signage.</li>
              <li>• A Gemini-written weekly briefing with concrete actions.</li>
              <li>• Roadside units are ESP32-based and ready to build (Wokwi design).</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/command" className="btn-amber">
                Command Center <ArrowRight className="size-4" />
              </Link>
              <Link to="/report" className="btn-steel">
                Wildlife Report
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-steel-800 py-8 text-center text-xs text-steel-500">
        OffGuard · Built at SBU Hacks · Steam &amp; Steel · Crossing history before today is simulated for this prototype.
      </footer>
    </main>
  );
}
