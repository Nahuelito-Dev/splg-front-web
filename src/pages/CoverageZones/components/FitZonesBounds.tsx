import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import type { CoverageZone } from '../../../services/api/types';
import { geoJsonRingToLatLngs } from '../coverageZoneUtils';

interface Props {
  zones: CoverageZone[];
}

/**
 * Encuadra el mapa a todas las zonas cargadas (con un margen), para no
 * depender de que el centro por defecto coincida con dónde están. Sin zonas,
 * deja el centro/zoom por defecto del `MapContainer`.
 */
export const FitZonesBounds = ({ zones }: Props) => {
  const map = useMap();
  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  const zonesKey = zones.map((zone) => zone.coverage_zone_id).join(',');

  useEffect(() => {
    const current = zonesRef.current;
    if (current.length === 0) return;
    const points = current.flatMap((zone) => geoJsonRingToLatLngs(zone.area.coordinates[0]));
    if (points.length === 0) return;
    map.fitBounds(latLngBounds(points), { padding: [24, 24] });
  }, [map, zonesKey]);

  return null;
};
