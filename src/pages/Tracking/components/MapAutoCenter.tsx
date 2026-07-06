import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

interface Props {
  focusPoint: { lat: number; lng: number } | null;
}

// Componente "invisible" que vive dentro del <MapContainer> solo para poder
// usar useMap(). Cuando llega la primera posición de un chofer, paneamos el
// mapa hacia ahí una única vez (después el admin puede moverse libremente
// sin que le pisemos la vista en cada evento nuevo).
export const MapAutoCenter = ({ focusPoint }: Props) => {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!focusPoint || hasCenteredRef.current) return;

    hasCenteredRef.current = true;
    map.flyTo([focusPoint.lat, focusPoint.lng], 15, { duration: 1 });
  }, [focusPoint, map]);

  return null;
};
