import { useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';
import type { LatLng } from './latLng';

/**
 * Si el punto cambia y queda fuera de la vista, lo trae al centro. Depende de la latitud y la longitud, no del objeto:
 * los formularios lo recrean en cada render y, si no, el mapa volvería al punto cada vez que se edita otro campo.
 */
export const KeepInView = ({ point }: { point: LatLng | null }) => {
  const map = useMap();
  const lat = point?.lat;
  const lng = point?.lng;
  useEffect(() => {
    if (!map || lat === undefined || lng === undefined) return;
    const target = { lat, lng };
    if (!map.getBounds()?.contains(target)) map.panTo(target);
  }, [map, lat, lng]);
  return null;
};
