import { errorMessage } from '../../services/api/errors';
import { argentinaDay, formatArgentinaDay, formatCurrency } from '../../utils/format';

/** Un punto `[lat, lng]`, como lo usa el formulario. */
export type LatLng = [number, number];

/**
 * GeoJSON ordena los puntos `[lng, lat]`; el formulario, `[lat, lng]`. Estas dos
 * funciones son el único lugar del panel donde se cruza de un orden al otro.
 */
export const geoJsonRingToLatLngs = (ring: number[][]): LatLng[] => ring.map(([lng, lat]) => [lat, lng]);

export const latLngsToGeoJsonRing = (points: LatLng[]): number[][] => points.map(([lat, lng]) => [lng, lat]);

/** Los vértices de una zona para dibujarla: sin el punto que cierra el anillo de GeoJSON (el mismo que el primero). */
export const zoneVertices = (ring: number[][]): { lat: number; lng: number }[] => {
  const points = geoJsonRingToLatLngs(ring).map(([lat, lng]) => ({ lat, lng }));
  const [first] = points;
  const last = points[points.length - 1];
  return points.length > 1 && first.lat === last.lat && first.lng === last.lng ? points.slice(0, -1) : points;
};

/** El anillo que se manda a la API a partir de los vértices del mapa (`[lng, lat]`, sin cerrar: lo cierra el back). */
export const verticesToGeoJsonRing = (points: { lat: number; lng: number }[]): number[][] =>
  points.map(({ lat, lng }) => [lng, lat]);

/** Distancia aproximada en metros entre dos puntos cercanos (alcanza para descartar vértices encimados). */
const metersBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const meters = 111_320;
  const dLat = (a.lat - b.lat) * meters;
  const dLng = (a.lng - b.lng) * meters * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};

/** Menos que esto entre dos vértices es el mismo punto: un doble clic, o cerrar tocando cerca del primero. */
export const MIN_VERTEX_GAP_METERS = 1;

/**
 * Los vértices de un trazo al terminarlo: el doble clic que lo cierra también suma dos clics casi en el mismo lugar, así
 * que se sacan los vértices encimados (a menos de 1 m del anterior, o el último sobre el primero).
 */
export const withoutRepeatedVertices = <P extends { lat: number; lng: number }>(points: P[]): P[] => {
  const kept = points.filter((p, i) => i === 0 || metersBetween(p, points[i - 1]) >= MIN_VERTEX_GAP_METERS);
  while (kept.length > 1 && metersBetween(kept[kept.length - 1], kept[0]) < MIN_VERTEX_GAP_METERS) kept.pop();
  return kept;
};

type XY = [number, number];

const orientation = (a: XY, b: XY, c: XY) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));

const onSegment = (a: XY, b: XY, p: XY) =>
  Math.min(a[0], b[0]) <= p[0] &&
  p[0] <= Math.max(a[0], b[0]) &&
  Math.min(a[1], b[1]) <= p[1] &&
  p[1] <= Math.max(a[1], b[1]);

const segmentsCross = (a: XY, b: XY, c: XY, d: XY) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && onSegment(a, b, c)) ||
    (o2 === 0 && onSegment(a, b, d)) ||
    (o3 === 0 && onSegment(c, d, a)) ||
    (o4 === 0 && onSegment(c, d, b))
  );
};

/**
 * Si los lados del polígono se cruzan entre sí (un «moño»): PostGIS lo rechaza (`ST_IsValid`), así que se avisa antes.
 * Recibe el anillo de la API (`[lng, lat]`, cerrado o no); los lados vecinos comparten un vértice y no cuentan.
 */
export const ringSelfIntersects = (ring: number[][] | null | undefined): boolean => {
  if (!ring || ring.length < 4) return false;
  const [first] = ring;
  const last = ring[ring.length - 1];
  const points = (first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring) as XY[];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsCross(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return true;
    }
  }
  return false;
};

export const SELF_INTERSECTION_MESSAGE =
  'Los lados de la zona se cruzan entre sí: mové los vértices para que el borde no se corte.';

/** El 400 de PostGIS («El polígono no es válido: Self-intersection at or near point…») dicho para la persona. */
export const zoneSaveError = (error: unknown): unknown => {
  const message = errorMessage(error);
  if (/self-intersection/i.test(message)) return new Error(SELF_INTERSECTION_MESSAGE);
  if (message.startsWith('El polígono no es válido'))
    return new Error(
      'El borde de la zona no es válido: revisá que los lados no se crucen ni tenga vértices encimados.',
    );
  return error;
};

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
  if (validFrom && validUntil) return `Del ${formatArgentinaDay(validFrom)} al ${formatArgentinaDay(validUntil)}`;
  if (validFrom) return `Desde el ${formatArgentinaDay(validFrom)}`;
  return `Hasta el ${formatArgentinaDay(validUntil as string)}`;
};

/** Mínimo de vértices que exige el back (`ArrayMinSize(3)` en el DTO). */
export const MIN_POLYGON_VERTICES = 3;

export const hasEnoughVertices = (ring: number[][] | null | undefined): boolean =>
  Boolean(ring && ring.length >= MIN_POLYGON_VERTICES);

/** El `YYYY-MM-DD` de un `<input type="date">` a partir del instante de vigencia de la API (su día argentino) (o vacío sin fecha). */
export const toDateInputValue = (iso: string | null): string => (iso ? argentinaDay(iso) : '');

/** Cantidad de vértices de un anillo GeoJSON: el último punto repite al primero para cerrarlo y no cuenta. */
export const countVertices = (ring: number[][] | undefined): number => {
  if (!ring || ring.length === 0) return 0;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = ring.length > 1 && first[0] === last[0] && first[1] === last[1];
  return closed ? ring.length - 1 : ring.length;
};

/**
 * Vigencia que se manda al guardar. Alta: el día elegido, o nada si está vacío. Edición: sólo lo que cambió respecto del
 * valor original; vaciar un campo que tenía fecha manda `null` (el back quita ese límite) y uno que no cambió no se manda.
 */
export const vigenciaChanges = (
  original: { validFrom: string | null; validUntil: string | null } | null,
  values: { validFrom: string; validUntil: string },
): { validFrom?: string | null; validUntil?: string | null } => {
  const pick = (current: string, before: string | null): string | null | undefined => {
    if (!original) return current || undefined;
    const was = toDateInputValue(before);
    return current === was ? undefined : current || null;
  };
  return {
    validFrom: pick(values.validFrom, original?.validFrom ?? null),
    validUntil: pick(values.validUntil, original?.validUntil ?? null),
  };
};
