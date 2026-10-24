// Pressure-gauge style stat dial (the "steam" half of the theme).
const START = -120;
const SWEEP = 240;

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arc(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

export function Gauge({ value = 0, max = 100, label, unit, danger = 0.75 }) {
  const frac = Math.max(0, Math.min(1, max ? value / max : 0));
  const angle = START + SWEEP * frac;
  const hot = frac >= danger;
  const ticks = Array.from({ length: 13 }, (_, i) => START + (SWEEP / 12) * i);
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 104" className="w-full max-w-[150px]">
        <defs>
          <radialGradient id="gface" cx="50%" cy="40%" r="65%">
            <stop offset="0" stopColor="#232a34" />
            <stop offset="1" stopColor="#0b0d10" />
          </radialGradient>
          <linearGradient id="gbezel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e4c879" />
            <stop offset="1" stopColor="#7d6127" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="58" r="46" fill="url(#gface)" stroke="url(#gbezel)" strokeWidth="4" />
        <path d={arc(60, 58, 36, START, START + SWEEP)} fill="none" stroke="#2f3742" strokeWidth="6" strokeLinecap="round" />
        <path d={arc(60, 58, 36, START + SWEEP * danger, START + SWEEP)} fill="none" stroke="#ff3b30" strokeOpacity="0.35" strokeWidth="6" />
        {frac > 0.001 && (
          <path d={arc(60, 58, 36, START, angle)} fill="none" stroke={hot ? '#ff3b30' : '#ffb020'} strokeWidth="6" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 3px rgba(255,176,32,.6))' }} />
        )}
        {ticks.map((t, i) => {
          const [x1, y1] = polar(60, 58, 28, t);
          const [x2, y2] = polar(60, 58, i % 3 === 0 ? 22 : 25, t);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6d7887" strokeWidth={i % 3 === 0 ? 1.6 : 0.8} />;
        })}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '60px 58px', transition: 'transform 1s cubic-bezier(.3,1.4,.5,1)' }}>
          <path d="M 58.5 58 L 60 24 L 61.5 58 Z" fill="#e4c879" />
        </g>
        <circle cx="60" cy="58" r="5" fill="#c9a24c" stroke="#0b0d10" strokeWidth="1.5" />
        <text x="60" y="86" textAnchor="middle" className="led" fill="#ffb020" fontSize="13" fontFamily="JetBrains Mono, monospace" fontWeight="700">
          {value}
          {unit && <tspan fontSize="8"> {unit}</tspan>}
        </text>
      </svg>
      <div className="panel-title -mt-1 text-center text-[11px]">{label}</div>
    </div>
  );
}
