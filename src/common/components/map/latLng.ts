/** Un punto como lo usa Google Maps. */
export type LatLng = google.maps.LatLngLiteral;

/** Un punto `[lat, lng]`, como lo guardan los formularios. */
export type LatLngTuple = [number, number];

/** Posadas, Misiones: donde opera la distribuidora. Centro de los mapas hasta que hay un punto. */
export const DEFAULT_MAP_CENTER: LatLng = { lat: -27.3671, lng: -55.8961 };

export const toLatLng = ([lat, lng]: LatLngTuple): LatLng => ({ lat, lng });

/** Clave estable de una lista de puntos: un arreglo nuevo con las mismas coordenadas no cuenta como cambio. */
export const pointsKey = (points: LatLng[]) => points.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|');

/** Línea punteada (Google Maps no tiene `dashArray`: se dibuja con un trazo repetido sobre una línea invisible). */
export const dashedLine = (
  color: string,
  weight = 3,
): Pick<google.maps.PolylineOptions, 'strokeOpacity' | 'strokeWeight' | 'icons'> => ({
  strokeOpacity: 0,
  strokeWeight: weight,
  icons: [
    {
      icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: color, strokeWeight: weight, scale: weight },
      offset: '0',
      repeat: `${weight * 5}px`,
    },
  ],
});
