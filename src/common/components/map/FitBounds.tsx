import { useMap } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';
import { pointsKey, type LatLng } from './latLng';

interface Props {
  points: LatLng[];
  /** Tope de acercamiento al encuadrar (dos paradas en la misma cuadra no tienen que verse a nivel edificio). */
  maxZoom?: number;
  padding?: number;
  /** Cuándo volver a encuadrar; por omisión, cuando cambian las coordenadas. */
  fitKey?: string;
  /**
   * Lo que se está mirando (la hoja, por ejemplo). Si la persona movió o acercó el mapa, no se le vuelve a encuadrar
   * hasta que cambie esto.
   */
  scopeKey?: string;
}

/** Encuadra el mapa para que se vean todos los puntos; con uno solo, lo centra. */
export const FitBounds = ({ points, maxZoom = 16, padding = 40, fitKey, scopeKey }: Props) => {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const key = fitKey ?? pointsKey(points);
  /** La persona arrastró o hizo zoom: su vista manda. */
  const touched = useRef(false);
  /** Mientras dura un encuadre propio, sus cambios de zoom no cuentan como de la persona. */
  const fitting = useRef(false);

  useEffect(() => {
    touched.current = false;
  }, [scopeKey]);

  useEffect(() => {
    if (!map) return;
    const listeners = [
      map.addListener('dragstart', () => {
        touched.current = true;
      }),
      map.addListener('zoom_changed', () => {
        if (!fitting.current) touched.current = true;
      }),
    ];
    return () => listeners.forEach((listener) => listener.remove());
  }, [map]);

  useEffect(() => {
    const current = pointsRef.current;
    if (!map || current.length === 0 || touched.current) return;
    fitting.current = true;
    const settled = google.maps.event.addListenerOnce(map, 'idle', () => {
      if ((map.getZoom() ?? 0) > maxZoom) map.setZoom(maxZoom);
      fitting.current = false;
    });
    if (current.length === 1) {
      map.setCenter(current[0]);
      map.setZoom(Math.min(15, maxZoom));
    } else {
      const bounds = new google.maps.LatLngBounds();
      current.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, padding);
    }
    return () => {
      settled.remove();
      fitting.current = false;
    };
  }, [map, key, scopeKey, maxZoom, padding]);

  return null;
};
