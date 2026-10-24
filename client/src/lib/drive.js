import { useEffect, useMemo, useRef, useState } from 'react';
import { milesBetween } from './format.js';
import { speak, chime } from './speech.js';

export const LOOKAHEAD_MILES = 6;

function bearing([lat1, lng1], [lat2, lng2]) {
  const r = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Position on the route at a given mile, interpolated between points. */
export function pointAtMile(route, mile) {
  const { coords, miles } = route;
  let lo = 0;
  let hi = miles.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (miles[mid] <= mile) lo = mid;
    else hi = mid;
  }
  const span = miles[hi] - miles[lo] || 1;
  const t = Math.min(1, Math.max(0, (mile - miles[lo]) / span));
  const [a, b] = [coords[lo], coords[hi]];
  return { lat: a[0] + (b[0] - a[0]) * t, lng: a[1] + (b[1] - a[1]) * t, heading: bearing(a, b) };
}

function mileNearest(route, [lat, lng]) {
  let best = 0;
  let bestD = Infinity;
  route.coords.forEach((c, i) => {
    const d = milesBetween([lat, lng], c);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return { mile: route.miles[best], offRoad: bestD };
}

/**
 * Where the driver is on I-495 East: either a simulated drive (sped up for
 * demos) or the phone's real GPS snapped onto the road.
 */
export function useDrive(route, sensors, { mode = 'sim', speedMph = 65, timeScale = 14, startMile = 8, running = true } = {}) {
  const [mile, setMile] = useState(startMile);
  const [gpsError, setGpsError] = useState(null);
  const mileRef = useRef(startMile);

  useEffect(() => {
    if (!route || mode !== 'sim' || !running) return;
    let raf;
    let last = performance.now();
    const step = (t) => {
      const dt = (t - last) / 1000;
      last = t;
      let next = mileRef.current + (speedMph * timeScale * dt) / 3600;
      if (next > route.lengthMiles - 0.5) next = startMile;
      mileRef.current = next;
      setMile(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [route, mode, running, speedMph, timeScale, startMile]);

  useEffect(() => {
    if (!route || mode !== 'gps') return;
    if (!navigator.geolocation) return setGpsError('This browser has no GPS access.');
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { mile: m, offRoad } = mileNearest(route, [pos.coords.latitude, pos.coords.longitude]);
        setGpsError(offRoad > 2 ? `You're ${offRoad.toFixed(1)} mi from I-495; showing the nearest point.` : null);
        mileRef.current = m;
        setMile(m);
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [route, mode]);

  const position = useMemo(() => (route ? pointAtMile(route, mile) : null), [route, mile]);

  const hazards = useMemo(
    () =>
      sensors
        .filter((s) => s.active && s.lastEvent && s.mile >= mile - 0.15 && s.mile - mile <= LOOKAHEAD_MILES)
        .map((s) => ({ sensor: s, event: s.lastEvent, milesAhead: Math.max(0, s.mile - mile) }))
        .sort((a, b) => a.milesAhead - b.milesAhead),
    [sensors, mile]
  );
  const nextSensor = useMemo(() => sensors.find((s) => s.mile > mile) ?? null, [sensors, mile]);

  const jumpTo = (m) => {
    mileRef.current = m;
    setMile(m);
  };

  return { mile, position, hazards, nextSensor, gpsError, jumpTo };
}

/**
 * Raises one takeover alert (with chime + voice) per new hazard ahead.
 * Returns the hazard to show and a dismiss function.
 */
export function useHazardAlert(hazards, { voice = true } = {}) {
  const seen = useRef(new Set());
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const fresh = hazards.find((h) => !seen.current.has(h.event.id));
    if (!fresh) return;
    seen.current.add(fresh.event.id);
    setCurrent(fresh);
    if (voice) {
      chime();
      const who = fresh.event.count > 1 ? `${fresh.event.count} ${fresh.event.species}` : fresh.event.species;
      setTimeout(() => speak(`Caution. ${who} reported ${fresh.milesAhead.toFixed(1)} miles ahead, near exit ${fresh.sensor.exit}. Slow down.`), 700);
    }
  }, [hazards, voice]);

  // Keep the live distance on the open alert; close it once passed.
  const live = current && hazards.find((h) => h.event.id === current.event.id);
  return { alert: live ?? null, dismiss: () => setCurrent(null) };
}
