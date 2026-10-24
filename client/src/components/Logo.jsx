export function Crossbuck({ className = 'size-7', lit = true }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g transform="translate(32 26)">
        {[35, -35].map((r) => (
          <rect key={r} x="-28" y="-5" width="56" height="10" rx="1.5" fill="#f4f1ea" stroke="#0b0d10" strokeWidth="1.2" transform={`rotate(${r})`} />
        ))}
      </g>
      <circle cx="18" cy="54" r="7" fill={lit ? '#ff3b30' : '#3a1412'} className={lit ? 'animate-flash-a' : ''} />
      <circle cx="46" cy="54" r="7" fill={lit ? '#ff3b30' : '#3a1412'} className={lit ? 'animate-flash-b' : ''} />
    </svg>
  );
}

export function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2.5">
      <Crossbuck className={big ? 'size-11' : 'size-8'} />
      <span className={`font-stencil leading-none font-black tracking-[0.08em] text-bone ${big ? 'text-4xl' : 'text-2xl'}`}>
        OFF<span className="text-signal">GUARD</span>
      </span>
    </span>
  );
}
