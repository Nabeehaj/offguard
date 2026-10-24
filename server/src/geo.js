import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config.js';

const EARTH_MILES = 3958.8;
const rad = (d) => (d * Math.PI) / 180;

export function milesBetween([lat1, lng1], [lat2, lng2]) {
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(a));
}

const raw = JSON.parse(readFileSync(path.join(DATA_DIR, 'i495-east.json'), 'utf8'));

// Cumulative mileage at each route point, so anything on the road can be
// described as "mile N" and compared with a driver's position.
const miles = [0];
for (let i = 1; i < raw.coords.length; i++) {
  miles.push(miles[i - 1] + milesBetween(raw.coords[i - 1], raw.coords[i]));
}

export const route = {
  name: raw.name,
  coords: raw.coords,
  miles,
  lengthMiles: miles.at(-1),
};

/** Nearest route point to a lat/lng: its index, position and route mile. */
export function snapToRoute(point) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < route.coords.length; i++) {
    const d = milesBetween(point, route.coords[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return { index: best, position: route.coords[best], mile: miles[best], offRoadMiles: bestDist };
}
