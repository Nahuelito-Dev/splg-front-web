import { formatCurrency, formatDate } from '../../utils/format';

/** Un punto lat/lng, como lo usan Leaflet y el formulario. */
export type LatLng = [number, number];

/**
 * GeoJSON ordena los puntos `[lng, lat]`; Leaflet, `[lat, lng]`. Estas dos
 * funciones son el único lugar del panel donde se cruza de un orden al otro.
 */
export const geoJsonRingToLatLngs = (ring: number[][]): LatLng[] => ring.map(([lng, lat]) => [lat, lng]);

export const latLngsToGeoJsonRing = (points: LatLng[]): number[][] => points.map(([lat, lng]) => [lng, lat]);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const isValidHexColor = (value: string): boolean => HEX_COLOR.test(value);

/** "+10 %" o "+$ 1.500", como lo pide la maqueta para la píldora de recargo. */
export const formatSurcharge = (type: 'fixed' | 'percentage', value: number): string =>
  type === 'percentage' ? `+${value} %` : `+${formatCurrency(value)}`;

/**
 * "Desde el 1 oct 2026", "Hasta el 31 dic 2026", "Del 1 oct 2026 al 31 dic
 * 2026" o `null` si la zona rige siempre (sin vigencia cargada).
 */
export const formatValidity = (validFrom: string | null, validUntil: string | null): string | null => {
  if (!validFrom && !validUntil) return null;
  if (validFrom && validUntil) return `Del ${formatDate(validFrom)} al ${formatDate(validUntil)}`;
  if (validFrom) return `Desde el ${formatDate(validFrom)}`;
  return `Hasta el ${formatDate(validUntil as string)}`;
};

/** Mínimo de vértices que exige el back (`ArrayMinSize(3)` en el DTO). */
export const MIN_POLYGON_VERTICES = 3;

export const hasEnoughVertices = (ring: number[][] | null | undefined): boolean =>
  Boolean(ring && ring.length >= MIN_POLYGON_VERTICES);

/** El `YYYY-MM-DD` de un `<input type="date">` a partir de un date-time ISO de la API (o vacío sin fecha). */
export const toDateInputValue = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');
