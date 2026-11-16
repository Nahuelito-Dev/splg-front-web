import { useMemo, useRef, useState } from 'react';
import { HtmlMarker } from '../../../common/components/map/HtmlMarker';
import type { LatLng } from '../../../common/components/map/latLng';
import { MapCanvas } from '../../../common/components/map/MapCanvas';
import { PointPin } from '../../../common/components/map/PointPin';
import type { CoverageZone } from '../../../services/api/types';
import {
  MIN_POLYGON_VERTICES,
  verticesToGeoJsonRing,
  withoutRepeatedVertices,
  zoneVertices,
} from '../coverageZoneUtils';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../mapDefaults';
import { DrawPolygonController, type PolygonDraft } from './DrawPolygonController';
import { ZonePolygon } from './ZonePolygon';

export type MapMode = 'idle' | 'draw' | 'edit' | 'pick';

const HINTS: Record<Exclude<MapMode, 'idle'>, string> = {
  draw: 'Hacé clic para marcar los vértices · doble clic o clic en el primero para terminar (mínimo 3 puntos)',
  edit: 'Arrastrá los vértices para ajustar la zona',
  pick: 'Hacé clic en el mapa para elegir el punto a probar',
};

const EMPTY_DRAFT: PolygonDraft = { points: [], closed: false };

const CLOSED_HINT = 'Arrastrá los vértices para ajustar la zona antes de guardarla';

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
 * Las zonas de cobertura sobre Google Maps. Según `mode`: dibujar una zona nueva (clic por vértice), editar los vértices
 * de la seleccionada, o elegir un punto para «Probar un punto».
 */
export const ZoneMap = ({
  zones,
  selectedZoneId,
  mode,
  onSelectZone,
  onPolygonChange,
  onPickPoint,
  pickedPoint,
}: Props) => {
  const [draft, setDraft] = useState<PolygonDraft>(EMPTY_DRAFT);
  const [draftMode, setDraftMode] = useState(mode);
  // Al salir de «dibujar» (se guardó o se canceló) el trazo se descarta: se ajusta en el render, sin un efecto.
  if (draftMode !== mode) {
    setDraftMode(mode);
    setDraft(EMPTY_DRAFT);
  }
  // El doble clic llega desde Google Maps justo después de los dos clics que suman vértices: se lee el último trazo.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const fitPoints = useMemo(() => zones.flatMap((zone) => zoneVertices(zone.area.coordinates[0])), [zones]);
  // Se encuadra cuando cambian las zonas que hay, no cuando se guarda un ajuste de una de ellas.
  const fitKey = zones.map((zone) => zone.coverage_zone_id).join(',');

  const addVertex = (point: LatLng) => setDraft((d) => (d.closed ? d : { ...d, points: [...d.points, point] }));

  const close = () => {
    const current = draftRef.current;
    if (current.closed) return;
    const points = withoutRepeatedVertices(current.points);
    if (points.length < MIN_POLYGON_VERTICES) {
      setDraft({ points, closed: false });
      return;
    }
    setDraft({ points, closed: true });
    onPolygonChange(verticesToGeoJsonRing(points));
  };

  const hint = mode === 'draw' && draft.closed ? CLOSED_HINT : mode === 'idle' ? null : HINTS[mode];

  return (
    <MapCanvas
      label="Mapa de zonas de cobertura"
      className="h-[560px] w-full"
      defaultCenter={DEFAULT_MAP_CENTER}
      defaultZoom={DEFAULT_MAP_ZOOM}
      gestures="greedy"
      fitPoints={fitPoints}
      fitKey={fitKey}
      cursor={(mode === 'draw' && !draft.closed) || mode === 'pick' ? 'crosshair' : undefined}
      disableDoubleClickZoom={mode === 'draw'}
      onClick={mode === 'draw' ? addVertex : mode === 'pick' ? onPickPoint : undefined}
      onDoubleClick={mode === 'draw' ? close : undefined}
      overlay={
        hint && (
          /* bg-side: el aviso queda oscuro sobre el mapa en los dos temas. */
          <div
            data-testid="zone-map-hint"
            className="pointer-events-none absolute left-1/2 top-3 z-10 w-max max-w-[90%] -translate-x-1/2 rounded-full bg-side/90 px-3 py-1.5 text-center text-xs text-white"
          >
            {hint}
          </div>
        )
      }
    >
      {zones.map((zone) => (
        <ZonePolygon
          // Al terminar de editar (guardada, cancelada o tras un error) se monta de nuevo: vuelve a la forma guardada.
          key={`${zone.coverage_zone_id}:${mode === 'edit' && zone.coverage_zone_id === selectedZoneId ? 'edit' : 'view'}`}
          zone={zone}
          highlighted={zone.coverage_zone_id === selectedZoneId}
          editable={mode === 'edit' && zone.coverage_zone_id === selectedZoneId}
          onChange={onPolygonChange}
          onSelect={mode === 'idle' ? () => onSelectZone(zone) : undefined}
        />
      ))}

      {mode === 'draw' && <DrawPolygonController draft={draft} onClose={close} onChange={onPolygonChange} />}

      {pickedPoint && (
        <HtmlMarker position={pickedPoint} title="Punto a probar" zIndex={20}>
          <PointPin />
        </HtmlMarker>
      )}
    </MapCanvas>
  );
};
