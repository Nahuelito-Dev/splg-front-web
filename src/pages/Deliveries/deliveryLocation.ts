export interface MapPoint {
  lat: number;
  lng: number;
}

/** "lat,lng" tal como lo devuelve la API (`latLng`), a un punto del mapa; `null` si falta o no son números. */
export const parseLatLng = (value: string | null | undefined): MapPoint | null => {
  if (!value) return null;
  const [lat, lng, ...rest] = value.split(',').map((part) => Number(part.trim()));
  if (rest.length > 0 || lat === undefined || lng === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};
