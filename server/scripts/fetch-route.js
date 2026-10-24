// Fetches the I-495 East (Long Island Expressway) road shape from the public
// OSRM demo server once and saves it into the repo, so the demo never depends
// on an outside routing service at runtime.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Queens/Nassau line -> Riverhead (lng,lat). The fastest route is the LIE;
// we keep only the steps that are actually on I 495.
const FROM = [-73.7085, 40.7537];
const TO = [-72.665, 40.918];

const url =
  `https://router.project-osrm.org/route/v1/driving/${FROM.join(',')};${TO.join(',')}` +
  '?overview=false&steps=true&geometries=geojson';

const res = await fetch(url);
if (!res.ok) throw new Error(`OSRM ${res.status}`);
const json = await res.json();
const steps = json.routes[0].legs[0].steps.filter((s) => s.ref?.includes('495'));
if (!steps.length) throw new Error('No I-495 steps in route');

// GeoJSON is [lng, lat]; store [lat, lng] rounded to ~1 m for Leaflet.
const coords = [];
for (const step of steps) {
  for (const [lng, lat] of step.geometry.coordinates) {
    const p = [+lat.toFixed(5), +lng.toFixed(5)];
    const last = coords.at(-1);
    if (!last || last[0] !== p[0] || last[1] !== p[1]) coords.push(p);
  }
}
const distanceMeters = steps.reduce((sum, s) => sum + s.distance, 0);

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/i495-east.json');
await writeFile(out, JSON.stringify({ name: 'I-495 East (Long Island Expressway)', distanceMeters, coords }));
console.log(`Saved ${coords.length} points, ${(distanceMeters / 1609.34).toFixed(1)} mi -> ${out}`);
