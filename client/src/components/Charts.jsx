import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { hourLabel, dayLabel } from '../lib/format.js';

const tooltipStyle = {
  contentStyle: { background: '#111418', border: '1px solid #2f3742', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 12 },
  labelStyle: { color: '#9ba5b2' },
  itemStyle: { color: '#ffb020' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

const isDawnDusk = (h) => (h >= 5 && h <= 7) || (h >= 17 && h <= 20);

export function HourChart({ byHour, height = 180 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={byHour} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <XAxis dataKey="hour" tickFormatter={hourLabel} interval={2} tick={{ fill: '#6d7887', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#2f3742' }} tickLine={false} />
        <YAxis tick={{ fill: '#6d7887', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} labelFormatter={(h) => `${hourLabel(h)}m`} formatter={(v) => [v, 'crossings']} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {byHour.map((d) => (
            <Cell key={d.hour} fill={isDawnDusk(d.hour) ? '#ff3b30' : '#4a5361'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyChart({ daily, height = 140 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={daily} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffb020" stopOpacity={0.45} />
            <stop offset="1" stopColor="#ffb020" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tickFormatter={(d) => new Date(d).getDate()} tick={{ fill: '#6d7887', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#2f3742' }} tickLine={false} />
        <YAxis tick={{ fill: '#6d7887', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} labelFormatter={dayLabel} formatter={(v) => [v, 'crossings']} />
        <Area type="monotone" dataKey="count" stroke="#ffb020" strokeWidth={2} fill="url(#dailyFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpeciesBars({ bySpecies }) {
  const max = Math.max(1, ...bySpecies.map((s) => s.count));
  return (
    <ul className="space-y-2.5">
      {bySpecies.map((s) => (
        <li key={s.species}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-steel-200">{s.species}</span>
            <span className="font-mono text-steel-400">{s.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-steel-900">
            <div className="h-full rounded-full bg-gradient-to-r from-brass to-amber" style={{ width: `${(s.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
