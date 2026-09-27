import { useEffect, useMemo, useRef } from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import type { LatLng, Polygon as LeafletPolygon } from 'leaflet';
import type { CoverageZone } from '../../../services/api/types';
import { DEFAULT_ZONE_COLOR } from '../../../theme/zoneColors';
import { formatSurcharge, geoJsonRingToLatLngs, latLngsToGeoJsonRing } from '../coverageZoneUtils';

interface Props {
  zone: CoverageZone;
  /** Zona resaltada en el mapa (seleccionada desde la lista), no implica edición. */
  highlighted: boolean;
  /** Vértices arrastrables (Geoman) mientras se edita esta zona. */
  editable: boolean;
  onChange: (ring: number[][]) => void;
  /** Sin ella, la zona no se puede seleccionar desde el mapa (mientras se dibuja o se edita otra). */
  onSelect?: () => void;
}

/**
 * Una zona existente en el mapa: el polígono relleno con su color y una
 * etiqueta con nombre + recargo. En modo edición, Geoman habilita sus
 * vértices y reporta el anillo actualizado en cada ajuste.
 */
export const ZonePolygon = ({ zone, highlighted, editable, onChange, onSelect }: Props) => {
  const layerRef = useRef<LeafletPolygon | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const positions = useMemo(() => geoJsonRingToLatLngs(zone.area.coordinates[0]), [zone]);
  const color = zone.color ?? DEFAULT_ZONE_COLOR;

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !editable) return;

    const reportChange = () => {
      const [ring] = layer.getLatLngs() as LatLng[][];
      onChangeRef.current(latLngsToGeoJsonRing(ring.map((point): [number, number] => [point.lat, point.lng])));
    };
    layer.pm.enable({ allowSelfIntersection: false });
    layer.on('pm:edit', reportChange);

    return () => {
      layer.off('pm:edit', reportChange);
      layer.pm.disable();
    };
  }, [editable]);

  return (
    <Polygon
      ref={layerRef}
      positions={positions}
      pathOptions={{ color, weight: highlighted || editable ? 3 : 2, fillOpacity: 0.14 }}
      eventHandlers={onSelect ? { click: onSelect } : undefined}
    >
      <Tooltip permanent direction="center" opacity={1}>
        {zone.name} · {formatSurcharge(zone.surchargeType, zone.surchargeValue)}
      </Tooltip>
    </Polygon>
  );
};
