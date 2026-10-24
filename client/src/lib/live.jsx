import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from './api.js';
import { milesBetween } from './format.js';

const LiveContext = createContext(null);

/**
 * One live view of the whole system, shared by every page: the road, the
 * sensors and their alert state, recent events and stats. Socket.IO pushes
 * new detections in instantly.
 */
export function LiveProvider({ children }) {
  const [route, setRoute] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);
  const listeners = useRef(new Set());
  const statsTimer = useRef();

  const refresh = useCallback(async () => {
    const [s, e, st, h] = await Promise.all([
      api.get('/api/sensors'),
      api.get('/api/events?limit=80'),
      api.get('/api/stats'),
      api.get('/api/health'),
    ]);
    setSensors(s);
    setEvents(e);
    setStats(st);
    setHealth(h);
  }, []);

  useEffect(() => {
    api.get('/api/route').then((r) => {
      const miles = [0];
      for (let i = 1; i < r.coords.length; i++) miles.push(miles[i - 1] + milesBetween(r.coords[i - 1], r.coords[i]));
      setRoute({ ...r, miles });
    });
    refresh().catch(console.error);

    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('detection', ({ event, sensor }) => {
      setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)].slice(0, 120));
      setSensors((prev) => prev.map((s) => (s.id === sensor.id ? { ...s, active: true, lastEvent: event } : s)));
      setLastDetection({ event, sensor, receivedAt: Date.now() });
      listeners.current.forEach((fn) => fn({ event, sensor }));
      clearTimeout(statsTimer.current);
      statsTimer.current = setTimeout(() => api.get('/api/stats').then(setStats), 400);
    });
    socket.on('cleared', () => refresh());

    // Alerts expire on the server after a window; re-check status each minute.
    const tick = setInterval(() => api.get('/api/sensors').then(setSensors).catch(() => {}), 60000);
    return () => {
      socket.disconnect();
      clearInterval(tick);
    };
  }, [refresh]);

  const onDetection = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const value = useMemo(
    () => ({ route, sensors, events, stats, health, connected, lastDetection, refresh, onDetection }),
    [route, sensors, events, stats, health, connected, lastDetection, refresh, onDetection]
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

/** Re-render every `ms` so "3 min ago" labels stay fresh. */
export function useNow(ms = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
