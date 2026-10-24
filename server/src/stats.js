import { config } from './config.js';
import { sensors } from './sensors.js';

const DAY = 86400000;

// "All clear" from the Command Center ends every active alert early.
export const alertState = { clearedAt: 0 };

export function sensorsWithStatus(events, now = Date.now()) {
  const latest = new Map();
  for (const e of events) latest.set(e.sensorId, e);
  return sensors.map((s) => {
    const last = latest.get(s.id) ?? null;
    const active = !!last && now - last.ts < config.alertWindowMs && last.ts > alertState.clearedAt;
    return { ...s, active, lastEvent: last };
  });
}

export function computeStats(events, now = Date.now()) {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const week = events.filter((e) => e.ts >= now - 7 * DAY);
  const month = events.filter((e) => e.ts >= now - 30 * DAY);

  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const bySpecies = {};
  const bySensor = Object.fromEntries(sensors.map((s) => [s.id, { sensorId: s.id, exit: s.exit, name: s.name, count: 0, animals: 0 }]));
  for (const e of month) {
    byHour[new Date(e.ts).getHours()].count++;
    bySpecies[e.species] = (bySpecies[e.species] ?? 0) + e.count;
    if (bySensor[e.sensorId]) {
      bySensor[e.sensorId].count++;
      bySensor[e.sensorId].animals += e.count;
    }
  }

  // Daily totals for the last 14 days, oldest first.
  const daily = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(now - (13 - i) * DAY).setHours(0, 0, 0, 0);
    const end = start + DAY;
    return { date: start, count: events.filter((e) => e.ts >= start && e.ts < end).length };
  });

  const active = sensorsWithStatus(events, now).filter((s) => s.active).length;

  return {
    today: events.filter((e) => e.ts >= startOfToday).length,
    week: week.length,
    month: month.length,
    animalsMonth: month.reduce((s, e) => s + e.count, 0),
    activeAlerts: active,
    sensorsOnline: sensors.length,
    byHour,
    bySpecies: Object.entries(bySpecies)
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count),
    bySensor: Object.values(bySensor).sort((a, b) => b.count - a.count),
    daily,
  };
}
