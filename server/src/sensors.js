import { snapToRoute } from './geo.js';

// Roadside camera units along I-495 East in Suffolk County. Locations are
// approximate exit positions, snapped onto the saved road shape at startup.
// `risk` weights the simulated history: higher means more crossings.
const SENSOR_SITES = [
  { id: 'exit-49', exit: 49, name: 'Melville', near: 'Rt 110 / Broadhollow Rd', at: [40.7925, -73.4155], risk: 0.4 },
  { id: 'exit-53', exit: 53, name: 'Brentwood', near: 'Sagtikos Pkwy', at: [40.7985, -73.2985], risk: 0.6 },
  { id: 'exit-57', exit: 57, name: 'Hauppauge', near: 'Veterans Memorial Hwy', at: [40.8068, -73.2150], risk: 0.8 },
  { id: 'exit-61', exit: 61, name: 'Holbrook', near: 'Patchogue-Holbrook Rd', at: [40.8100, -73.0950], risk: 0.9 },
  { id: 'exit-64', exit: 64, name: 'Medford', near: 'Rt 112', at: [40.8152, -73.0010], risk: 1.3 },
  { id: 'exit-66', exit: 66, name: 'Yaphank', near: 'Sills Rd', at: [40.8235, -72.9370], risk: 1.6 },
  { id: 'exit-68', exit: 68, name: 'Shirley', near: 'William Floyd Pkwy', at: [40.8440, -72.8800], risk: 2.2 },
  { id: 'exit-70', exit: 70, name: 'Manorville', near: 'CR 111', at: [40.8620, -72.8000], risk: 2.0 },
];

export const sensors = SENSOR_SITES.map(({ at, ...site }) => {
  const snap = snapToRoute(at);
  return { ...site, lat: snap.position[0], lng: snap.position[1], mile: +snap.mile.toFixed(2) };
}).sort((a, b) => a.mile - b.mile);

export const sensorById = new Map(sensors.map((s) => [s.id, s]));
