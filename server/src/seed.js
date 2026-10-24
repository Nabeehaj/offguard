import { randomUUID } from 'node:crypto';
import { sensors } from './sensors.js';

// Simulated 30-day crossing history. Real I-495 crossing data isn't public,
// so this is shaped like the real pattern: mostly white-tailed deer, peaking
// at dawn and dusk, and heavier toward the wooded eastern exits.

const SPECIES = [
  { species: 'White-tailed deer', key: 'deer', weight: 0.62, maxCount: 4 },
  { species: 'Red fox', key: 'fox', weight: 0.11, maxCount: 2 },
  { species: 'Raccoon', key: 'raccoon', weight: 0.1, maxCount: 3 },
  { species: 'Wild turkey', key: 'turkey', weight: 0.08, maxCount: 6 },
  { species: 'Opossum', key: 'opossum', weight: 0.06, maxCount: 1 },
  { species: 'Eastern coyote', key: 'coyote', weight: 0.03, maxCount: 2 },
];

// Relative crossing likelihood by hour of day (0-23).
const HOUR_WEIGHTS = [
  3, 2, 2, 2, 3, 7, 10, 8, 4, 2, 1, 1, 1, 1, 1, 2, 3, 6, 10, 11, 8, 5, 4, 3,
];

const BEHAVIORS = [
  'crossing toward the median',
  'standing on the shoulder',
  'moving along the tree line',
  'crossing eastbound lanes',
  'grazing near the guardrail',
];

function pick(items, weightOf) {
  const total = items.reduce((s, it) => s + weightOf(it), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items.at(-1);
}

export function generateHistory({ days = 30, perDay = 12, now = Date.now() } = {}) {
  const events = [];
  const hours = HOUR_WEIGHTS.map((w, h) => ({ h, w }));
  for (let d = days; d >= 0; d--) {
    // Some days are busier (rut season / weather), so vary the count.
    const count = Math.round(perDay * (0.6 + Math.random() * 0.8));
    for (let i = 0; i < count; i++) {
      const sensor = pick(sensors, (s) => s.risk);
      const kind = pick(SPECIES, (s) => s.weight);
      const { h } = pick(hours, (x) => x.w);
      const day = new Date(now - d * 86400000);
      day.setHours(h, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
      // Leave the last half hour empty so no sensor starts in alert.
      if (day.getTime() > now - 30 * 60 * 1000) continue;
      const n = 1 + Math.floor(Math.random() ** 2 * kind.maxCount);
      events.push({
        id: randomUUID(),
        ts: day.getTime(),
        sensorId: sensor.id,
        species: kind.species,
        speciesKey: kind.key,
        count: n,
        confidence: +(0.7 + Math.random() * 0.29).toFixed(2),
        behavior: BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)],
        source: 'simulated',
      });
    }
  }
  return events.sort((a, b) => a.ts - b.ts);
}
