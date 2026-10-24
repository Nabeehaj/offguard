import { NavLink, Link } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { useLive } from '../lib/live.jsx';

const LINKS = [
  { to: '/command', label: 'Command Center' },
  { to: '/detector', label: 'Detector' },
  { to: '/drive', label: 'Driver App' },
  { to: '/report', label: 'Wildlife Report' },
];

export function NavBar() {
  const { connected, sensors } = useLive();
  const active = sensors.filter((s) => s.active).length;
  return (
    <header className="sticky top-0 z-[1000] border-b border-steel-700/70 bg-steel-950/85 backdrop-blur">
      <div className="hazard h-1 opacity-80" />
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-2.5 sm:px-6">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 font-display text-[15px] font-bold tracking-[0.1em] uppercase transition ${
                  isActive ? 'bg-steel-800 text-amber' : 'text-steel-300 hover:text-steel-100'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {active > 0 && (
            <span className="chip border-signal/50 bg-signal/15 text-[#ffb4ae]">
              <span className="size-1.5 animate-flash-a rounded-full bg-signal" />
              {active} ACTIVE
            </span>
          )}
          <span className="chip">
            <span className={`size-1.5 rounded-full ${connected ? 'bg-go' : 'bg-steel-500'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `shrink-0 rounded-md px-2.5 py-1 font-display text-sm font-bold tracking-wider uppercase ${
                isActive ? 'bg-steel-800 text-amber' : 'text-steel-300'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
