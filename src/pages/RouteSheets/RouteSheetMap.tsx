import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { RouteSheetExecutionStop } from '../../services/api/types';
import brand from '../../theme/brand.json';
import '../Tracking/leafletIconFix';
import { hhmm, stopName } from './routeSheetLabels';

/** Posadas, Misiones: donde opera la distribuidora. */
const DEFAULT_CENTER: [number, number] = [-27.3671, -55.8961];

const TONE = {
  normal: 'bg-primary text-on-primary',
  late: 'bg-danger text-white',
  locked: 'bg-ink text-surface',
  current: 'bg-info text-white',
  done: 'bg-success text-white',
};

type Tone = keyof typeof TONE;

const numbered = (sequence: number, tone: Tone, selected: boolean) =>
  L.divIcon({
    className: '',
    html: `<span class="flex ${selected ? 'h-9 w-9 ring-4 ring-primary/40' : 'h-7 w-7'} items-center justify-center rounded-full border-2 border-surface ${TONE[tone]} text-xs font-semibold shadow-control">${sequence}</span>`,
    iconSize: selected ? [36, 36] : [28, 28],
    iconAnchor: selected ? [18, 18] : [14, 14],
  });

const driverIcon = L.divIcon({
  className: '',
  html: '<span class="block h-5 w-5 rounded-full border-[3px] border-surface bg-info shadow-control ring-4 ring-info-soft"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/** Lo que el mapa necesita de una parada: sirve la del plan y la del seguimiento. */
export interface MapStop {
  orderId: string;
  sequence: number | null;
  customerName: string | null;
  lat: number | null;
  lng: number | null;
  late: boolean;
  locked?: boolean;
  progress?: RouteSheetExecutionStop['progress'];
}

type Located = MapStop & { lat: number; lng: number; sequence: number };
const located = (stop: MapStop): stop is Located => stop.lat !== null && stop.lng !== null && stop.sequence !== null;

const toneOf = (stop: MapStop): Tone => {
  if (stop.progress === 'delivered') return 'done';
  if (stop.progress === 'on_the_way') return 'current';
  if (stop.late) return 'late';
  return stop.locked ? 'locked' : 'normal';
};

const FitRoute = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
  }, [map, points]);
  return null;
};

interface Props {
  stops: MapStop[];
  selectedId: string | null;
  onSelect: (orderId: string) => void;
  /** Última posición del chofer (hoja en curso). */
  driver?: { lat: number; lng: number; at: string | null } | null;
}

/**
 * El recorrido de la hoja sobre el mapa: cada parada numerada en su orden, unidas en línea recta. En la calle, las
 * entregadas en verde, la que está en camino resaltada y el chofer en su última posición. Las que salieron no van.
 */
export const RouteSheetMap = ({ stops, selectedId, onSelect, driver }: Props) => {
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
            icon={numbered(stop.sequence, toneOf(stop), stop.orderId === selectedId)}
            eventHandlers={{ click: () => onSelect(stop.orderId) }}
          />
        ))}
        {driver && (
          <Marker
            position={[driver.lat, driver.lng]}
            title={driver.at ? `Chofer · ${hhmm(driver.at)}` : 'Chofer'}
            icon={driverIcon}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>
    </div>
  );
};
