import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLng, Layer, Polygon } from 'leaflet';
import { latLngsToGeoJsonRing } from '../coverageZoneUtils';

const ringFromLayer = (layer: Polygon): number[][] => {
  const [ring] = layer.getLatLngs() as LatLng[][];
  return latLngsToGeoJsonRing(ring.map((point): [number, number] => [point.lat, point.lng]));
};

interface Props {
  /** El polígono nuevo se reporta acá cada vez que cambia (al terminar el trazo y en cada ajuste de vértice). */
  onChange: (ring: number[][]) => void;
}

/**
 * Mientras está montado, habilita el modo "dibujar polígono" de Geoman. Al
 * terminar el trazo deja el polígono con sus vértices editables (arrastrables)
 * para que el usuario los ajuste antes de guardar. Al desmontarse (se guardó
 * o se canceló) saca el polígono en construcción del mapa.
 */
export const DrawPolygonController = ({ onChange }: Props) => {
  const map = useMap();
  const layerRef = useRef<Polygon | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const handleCreate = (event: { layer: Layer }) => {
      const layer = event.layer as Polygon;
      layerRef.current = layer;
      layer.pm.enable({ allowSelfIntersection: false });
      onChangeRef.current(ringFromLayer(layer));
      layer.on('pm:edit', () => onChangeRef.current(ringFromLayer(layer)));
    };

    map.pm.enableDraw('Polygon', { allowSelfIntersection: false, finishOn: 'dblclick', tooltips: false });
    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
      map.pm.disableDraw('Polygon');
      layerRef.current?.remove();
      layerRef.current = null;
    };
  }, [map]);

  return null;
};
