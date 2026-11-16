import { Polygon } from '@vis.gl/react-google-maps';
import { useMemo } from 'react';
import { HtmlMarker } from '../../../common/components/map/HtmlMarker';
import { cx } from '../../../common/components/ui';
import type { CoverageZone } from '../../../services/api/types';
import { DEFAULT_ZONE_COLOR } from '../../../theme/zoneColors';
import { formatSurcharge, verticesToGeoJsonRing, zoneVertices } from '../coverageZoneUtils';

interface Props {
  zone: CoverageZone;
  /** Zona resaltada en el mapa (seleccionada desde la lista), no implica edición. */
  highlighted: boolean;
  /** Vértices arrastrables mientras se edita esta zona. */
  editable: boolean;
  onChange: (ring: number[][]) => void;
  /** Sin ella, la zona no se puede seleccionar desde el mapa (mientras se dibuja o se edita otra). */
  onSelect?: () => void;
}

/**
 * Una zona existente en el mapa: el polígono relleno con su color y una etiqueta con nombre + recargo. En edición,
 * Google Maps deja arrastrar sus vértices (y agregar uno tirando del punto medio de un lado) y cada ajuste se informa.
 */
export const ZonePolygon = ({ zone, highlighted, editable, onChange, onSelect }: Props) => {
  const vertices = useMemo(() => zoneVertices(zone.area.coordinates[0]), [zone]);
  const center = useMemo(
    () => ({
      lat: vertices.reduce((sum, p) => sum + p.lat, 0) / Math.max(vertices.length, 1),
      lng: vertices.reduce((sum, p) => sum + p.lng, 0) / Math.max(vertices.length, 1),
    }),
    [vertices],
  );
  const color = zone.color ?? DEFAULT_ZONE_COLOR;
  const label = `${zone.name} · ${formatSurcharge(zone.surchargeType, zone.surchargeValue)}`;

  return (
    <>
      <Polygon
        paths={vertices}
        strokeColor={color}
        strokeOpacity={1}
        strokeWeight={highlighted || editable ? 3 : 2}
        fillColor={color}
        fillOpacity={highlighted || editable ? 0.22 : 0.14}
        clickable={Boolean(onSelect) || editable}
        editable={editable}
        draggable={false}
        zIndex={editable ? 3 : highlighted ? 2 : 1}
        onClick={onSelect}
        onPathsChanged={
          editable
            ? ([ring]) => onChange(verticesToGeoJsonRing(ring.map((point) => ({ lat: point.lat(), lng: point.lng() }))))
            : undefined
        }
      />
      {vertices.length > 0 && (
        <HtmlMarker position={center} title={label} onClick={onSelect} zIndex={1}>
          <span
            className={cx(
              'block whitespace-nowrap rounded-md border border-outline bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-ink shadow-control',
              !onSelect && 'pointer-events-none',
            )}
          >
            {label}
          </span>
        </HtmlMarker>
      )}
    </>
  );
};
