// The roadside unit: crossbuck, alternating signal lamps, LED message board
// and a gate arm that drops when an animal is detected.

function Lamp({ cx, cy, on, phase }) {
  return (
    <g>
      <path d={`M ${cx - 34} ${cy - 6} A 34 34 0 0 1 ${cx + 34} ${cy - 6} L ${cx + 30} ${cy - 30} L ${cx - 30} ${cy - 30} Z`} fill="#1a1f27" />
      <circle cx={cx} cy={cy} r="30" fill="#0b0d10" stroke="#2f3742" strokeWidth="4" />
      <circle cx={cx} cy={cy} r="24" fill="#3a1412" />
      {on && (
        <g className={phase === 'a' ? 'animate-flash-a' : 'animate-flash-b'}>
          <circle cx={cx} cy={cy} r="48" fill="#ff3b30" opacity="0.22" />
          <circle cx={cx} cy={cy} r="24" fill="#ff3b30" />
          <circle cx={cx - 7} cy={cy - 8} r="7" fill="#ffd5d1" opacity="0.7" />
        </g>
      )}
    </g>
  );
}

export function CrossingSign({ active = false, message, sub, className = '' }) {
  const text = message ?? (active ? 'ANIMAL ON ROAD' : 'ALL CLEAR');
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 360 290" className="w-full max-w-[340px]" role="img" aria-label={active ? 'Crossing signal flashing' : 'Crossing signal idle'}>
        {/* gate arm (drawn first so it sits behind the sign when raised): swings down when active */}
        <g
          style={{
            transform: `rotate(${active ? 0 : -78}deg)`,
            transformOrigin: '190px 250px',
            transition: 'transform 1.4s cubic-bezier(.5,0,.2,1)',
          }}
        >
          <rect x="190" y="243" width="170" height="14" rx="3" fill="#f4f1ea" stroke="#0b0d10" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={204 + i * 32} y="243" width="16" height="14" fill="#ff3b30" />
          ))}
          <circle cx="352" cy="250" r="4" fill={active ? '#ff3b30' : '#3a1412'} className={active ? 'animate-flash-a' : ''} />
        </g>

        {/* mast */}
        <rect x="171" y="30" width="18" height="250" rx="3" fill="#4a5361" />
        <rect x="171" y="30" width="6" height="250" fill="#6d7887" opacity="0.5" />
        <rect x="140" y="272" width="80" height="14" rx="3" fill="#2f3742" />

        {/* crossbuck: like a railroad "RAIL / ROAD", each word is split around the center bolt */}
        <g transform="translate(180 68)">
          {[
            [32, 'WILD', 'LIFE'],
            [-32, 'CROSS', 'ING'],
          ].map(([r, left, right]) => (
            <g key={left} transform={`rotate(${r})`}>
              <rect x="-150" y="-19" width="300" height="38" rx="4" fill="#f4f1ea" stroke="#0b0d10" strokeWidth="3" />
              {[
                [-82, left],
                [82, right],
              ].map(([x, word]) => (
                <text key={word} x={x} y="10" textAnchor="middle" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="900" fontSize="28" letterSpacing="4" fill="#0b0d10">
                  {word}
                </text>
              ))}
            </g>
          ))}
          <circle r="7" fill="#4a5361" stroke="#0b0d10" strokeWidth="2" />
        </g>

        {/* lamp bar */}
        <rect x="92" y="150" width="176" height="12" rx="3" fill="#2f3742" />
        <Lamp cx={108} cy={190} on={active} phase="a" />
        <Lamp cx={252} cy={190} on={active} phase="b" />

        <circle cx="190" cy="250" r="9" fill="#232a34" stroke="#6d7887" strokeWidth="2" />
      </svg>

      <div className="led-grid mt-2 w-full max-w-[340px] overflow-hidden rounded-md border-2 border-steel-600 bg-black px-3 py-2">
        <div className={`truncate text-center text-lg font-bold ${active ? 'led led-red' : 'led'}`}>{text}</div>
        {sub && <div className="led truncate text-center text-xs opacity-80">{sub}</div>}
      </div>
    </div>
  );
}
