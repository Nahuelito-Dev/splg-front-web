import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// Import de efecto: además de los tipos (`Map.pm`, `Polygon.pm`), esto parchea
// los prototipos de Leaflet en tiempo de ejecución. Sin él, `map.pm` es `undefined`.
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { CoverageZone } from '../../../services/api/types';
import brand from '../../../theme/brand.json';
import { DrawPolygonController } from './DrawPolygonController';
import { FitZonesBounds } from './FitZonesBounds';
import { PickPointController } from './PickPointController';
import { ZonePolygon } from './ZonePolygon';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../mapDefaults';

export type MapMode = 'idle' | 'draw' | 'edit' | 'pick';

const HINTS: Record<Exclude<MapMode, 'idle'>, string> = {
  draw: 'Hacé clic para marcar los vértices · doble clic para terminar (mínimo 3 puntos)',
  edit: 'Arrastrá los vértices para ajustar la zona',
  pick: 'Hacé clic en el mapa para elegir el punto a probar',
};

interface Props {
  zones: CoverageZone[];
  selectedZoneId: string | null;
  mode: MapMode;
  onSelectZone: (zone: CoverageZone) => void;
  onPolygonChange: (ring: number[][]) => void;
  onPickPoint: (point: { lat: number; lng: number }) => void;
  pickedPoint: { lat: number; lng: number } | null;
}

/**
 * Mapa Leaflet con las zonas de cobertura. Según `mode`, delega en Geoman el
 * dibujo de una zona nueva, la edición de vértices de la seleccionada, o la
 * elección de un punto para "Probar un punto".
 */
export const ZoneMap = ({
  zones,
  selectedZoneId,
  mode,
  onSelectZone,
  onPolygonChange,
  onPickPoint,
  pickedPoint,
}: Props) => (
  <div className="relative isolate h-[560px] w-full" role="group" aria-label="Mapa de zonas de cobertura">
    <MapContainer
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitZonesBounds zones={zones} />

      {mode === 'draw' && <DrawPolygonController onChange={onPolygonChange} />}
      {mode === 'pick' && <PickPointController onPick={onPickPoint} />}

      {zones.map((zone) => (
        <ZonePolygon
          key={zone.coverage_zone_id}
          zone={zone}
          highlighted={zone.coverage_zone_id === selectedZoneId}
          editable={mode === 'edit' && zone.coverage_zone_id === selectedZoneId}
          onChange={onPolygonChange}
          onSelect={mode === 'idle' ? () => onSelectZone(zone) : undefined}
        />
      ))}

      {pickedPoint && (
        <CircleMarker
          center={[pickedPoint.lat, pickedPoint.lng]}
          radius={7}
          pathOptions={{ color: brand.tinta['900'], fillOpacity: 1 }}
        />
      )}
    </MapContainer>

    {mode !== 'idle' && (
      /* bg-side (no bg-ink): flota sobre las teselas del mapa, siempre claras, así que el
         aviso se queda siempre oscuro sin importar el tema del panel. */
      <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-side/90 px-3 py-1.5 text-xs text-white">
        {HINTS[mode]}
      </div>
    )}
  </div>
);
