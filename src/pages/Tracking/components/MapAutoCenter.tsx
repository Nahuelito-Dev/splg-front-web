import { useMap } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';

interface Props {
  focusPoint: { lat: number; lng: number } | null;
}

/**
 * Cuando llega la primera posición de un chofer, lleva el mapa hasta ahí una única vez: después el admin se mueve
 * libremente sin que cada evento nuevo le pise la vista.
 */
export const MapAutoCenter = ({ focusPoint }: Props) => {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!map || !focusPoint || hasCenteredRef.current) return;
    hasCenteredRef.current = true;
    map.panTo(focusPoint);
    map.setZoom(15);
  }, [focusPoint, map]);

  return null;
};
