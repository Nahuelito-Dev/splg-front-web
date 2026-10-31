import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import '../Tracking/leafletIconFix';

type Point = { position: [number, number]; sequence: number };

/** Posadas, Misiones: donde opera la distribuidora. */
const DEFAULT_CENTER: [number, number] = [-27.3671, -55.8961];

const numbered = (sequence: number) =>
  L.divIcon({
    className: '',
    html: `<span class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary text-xs font-semibold text-on-primary shadow-control">${sequence}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const FitRoute = ({ points }: { points: Point[] }) => {
  const map = useMap();
  useMemo(() => {
    if (points.length > 0) map.fitBounds(L.latLngBounds(points.map((p) => p.position)), { padding: [32, 32] });
  }, [map, points]);
  return null;
};

/** El recorrido sobre el mapa: cada parada numerada en su orden de entrega, unidas en línea recta. */
export const RouteBatchMap = ({ points, label }: { points: Point[]; label: string }) => (
  <div role="img" aria-label={label} className="h-64 overflow-hidden rounded-lg border border-outline">
    <MapContainer
      center={points[0]?.position ?? DEFAULT_CENTER}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitRoute points={points} />
      {points.length > 1 && (
        <Polyline positions={points.map((p) => p.position)} pathOptions={{ weight: 3, dashArray: '6 6' }} />
      )}
      {points.map((p) => (
        <Marker key={p.sequence} position={p.position} icon={numbered(p.sequence)} />
      ))}
    </MapContainer>
  </div>
);
