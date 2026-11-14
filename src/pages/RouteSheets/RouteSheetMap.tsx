import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { RouteSheetStop } from '../../services/api/types';
import brand from '../../theme/brand.json';
import '../Tracking/leafletIconFix';
import { stopName } from './routeSheetLabels';

/** Posadas, Misiones: donde opera la distribuidora. */
const DEFAULT_CENTER: [number, number] = [-27.3671, -55.8961];

const TONE = { normal: 'bg-primary text-on-primary', late: 'bg-danger text-white', locked: 'bg-ink text-surface' };

const numbered = (sequence: number, tone: keyof typeof TONE, selected: boolean) =>
  L.divIcon({
    className: '',
    html: `<span class="flex ${selected ? 'h-9 w-9 ring-4 ring-primary/40' : 'h-7 w-7'} items-center justify-center rounded-full border-2 border-surface ${TONE[tone]} text-xs font-semibold shadow-control">${sequence}</span>`,
    iconSize: selected ? [36, 36] : [28, 28],
    iconAnchor: selected ? [18, 18] : [14, 14],
  });

type Located = RouteSheetStop & { lat: number; lng: number };
const located = (stop: RouteSheetStop): stop is Located => stop.lat !== null && stop.lng !== null;

const FitRoute = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
  }, [map, points]);
  return null;
};

interface Props {
  stops: RouteSheetStop[];
  selectedId: string | null;
  onSelect: (orderId: string) => void;
}

/** El recorrido de la hoja sobre el mapa: cada parada numerada en su orden, unidas en línea recta. */
export const RouteSheetMap = ({ stops, selectedId, onSelect }: Props) => {
  const points = useMemo(() => stops.filter(located), [stops]);
  const positions = useMemo(() => points.map((s): [number, number] => [s.lat, s.lng]), [points]);
  return (
    <div role="img" aria-label="Mapa del recorrido" className="h-72 overflow-hidden sm:h-96">
      <MapContainer
        center={positions[0] ?? DEFAULT_CENTER}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitRoute points={positions} />
        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: brand.llama['500'], weight: 3, dashArray: '6 6' }} />
        )}
        {points.map((stop) => (
          <Marker
            key={stop.orderId}
            position={[stop.lat, stop.lng]}
            title={`${stop.sequence}. ${stopName(stop)}`}
            icon={numbered(
              stop.sequence,
              stop.late ? 'late' : stop.locked ? 'locked' : 'normal',
              stop.orderId === selectedId,
            )}
            eventHandlers={{ click: () => onSelect(stop.orderId) }}
          />
        ))}
      </MapContainer>
    </div>
  );
};
