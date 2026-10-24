import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Free OpenStreetMap tiles (no key), darkened by the .og-tiles CSS filter.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function sensorIcon(sensor, selected) {
  const ring = sensor.active
    ? `<span style="position:absolute;inset:0;border-radius:9999px;background:#ff3b30" class="animate-ping-slow"></span>`
    : '';
  const color = sensor.active ? '#ff3b30' : selected ? '#ffb020' : '#c9d0d8';
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<span style="position:relative;display:block;width:22px;height:22px">${ring}
      <span style="position:absolute;inset:3px;border-radius:4px;transform:rotate(45deg);background:#0b0d10;border:3px solid ${color};box-shadow:0 0 12px ${sensor.active ? '#ff3b30' : 'transparent'}"></span></span>`,
  });
}

const carIcon = (heading = 0) =>
  L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="width:34px;height:34px;display:grid;place-items:center;transform:rotate(${heading}deg)">
      <svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="11" fill="#ffb020" opacity=".25"/><path d="M12 3 L19 20 L12 16 L5 20 Z" fill="#ffb020" stroke="#0b0d10" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`,
  });

function FitRoute({ coords, follow, padding }) {
  const map = useMap();
  useEffect(() => {
    if (coords?.length && !follow) map.fitBounds(L.latLngBounds(coords), { padding: [padding, padding] });
  }, [coords, follow, map, padding]);
  useEffect(() => {
    if (follow) map.setView(follow, Math.max(map.getZoom(), 13), { animate: true, duration: 0.5 });
  }, [follow, map]);
  return null;
}

export function SensorMap({ route, sensors, hotspots, selectedId, onSelect, car, followCar = false, padding = 30, className = '' }) {
  const maxCount = useMemo(() => Math.max(1, ...(hotspots ?? []).map((h) => h.count)), [hotspots]);
  const hotById = useMemo(() => new Map((hotspots ?? []).map((h) => [h.sensorId, h])), [hotspots]);
  if (!route) return <div className={`grid place-items-center text-steel-400 ${className}`}>Loading map…</div>;
  return (
    <MapContainer
      className={className}
      center={[40.82, -73.1]}
      zoom={10}
      zoomControl={!followCar}
      attributionControl
      scrollWheelZoom
      preferCanvas
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={19} className="og-tiles" />
      <FitRoute coords={route.coords} follow={followCar && car ? [car.lat, car.lng] : null} padding={padding} />

      <Polyline positions={route.coords} pathOptions={{ color: '#ffb020', weight: 12, opacity: 0.12 }} />
      <Polyline positions={route.coords} pathOptions={{ color: '#ffb020', weight: 3, opacity: 0.9, dashArray: '1 0' }} />

      {hotspots &&
        sensors.map((s) => {
          const h = hotById.get(s.id);
          if (!h) return null;
          const t = h.count / maxCount;
          return (
            <CircleMarker
              key={`heat-${s.id}`}
              center={[s.lat, s.lng]}
              radius={14 + t * 38}
              pathOptions={{ stroke: false, fillColor: t > 0.66 ? '#ff3b30' : t > 0.33 ? '#ff7a1a' : '#ffb020', fillOpacity: 0.12 + t * 0.22 }}
              interactive={false}
            />
          );
        })}

      {sensors.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={sensorIcon(s, s.id === selectedId)} eventHandlers={{ click: () => onSelect?.(s) }}>
          <Tooltip className="og-tip" direction="top" offset={[0, -10]} permanent={s.active}>
            EXIT {s.exit} · {s.name.toUpperCase()}
            {s.active && <span style={{ color: '#ff5a4f' }}> · ALERT</span>}
          </Tooltip>
        </Marker>
      ))}

      {car && <Marker position={[car.lat, car.lng]} icon={carIcon(car.heading)} zIndexOffset={1000} />}
    </MapContainer>
  );
}
