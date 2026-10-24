export const SPECIES = {
  deer: { emoji: '🦌', label: 'Deer' },
  fox: { emoji: '🦊', label: 'Fox' },
  raccoon: { emoji: '🦝', label: 'Raccoon' },
  turkey: { emoji: '🦃', label: 'Turkey' },
  opossum: { emoji: '🐀', label: 'Opossum' },
  coyote: { emoji: '🐺', label: 'Coyote' },
  bear: { emoji: '🐻', label: 'Bear' },
  other: { emoji: '🐾', label: 'Animal' },
};

export const speciesEmoji = (key) => (SPECIES[key] ?? SPECIES.other).emoji;

export function timeAgo(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

export const clock = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const dayLabel = (ts) => new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
export const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;

const EARTH_MILES = 3958.8;
const rad = (d) => (d * Math.PI) / 180;
export function milesBetween([lat1, lng1], [lat2, lng2]) {
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(a));
}
