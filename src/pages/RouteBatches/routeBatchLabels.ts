import type { RouteBatch } from '../../services/api/types';
import type { Label } from '../../utils/statusLabels';
import { formatNumber } from '../../utils/format';

type Map<K extends string> = Record<K, Label>;

/** En qué va un lote de recorrido (CU-107). */
export const ROUTE_BATCH_STATUS: Map<RouteBatch['status']> = {
  forming: { text: 'Armándose', tone: 'neutral' },
  offered: { text: 'Ofrecido', tone: 'info' },
  assigned: { text: 'Asignado', tone: 'success' },
  dissolved: { text: 'Deshecho', tone: 'warn' },
  completed: { text: 'Completado', tone: 'success' },
};

/** Qué pasó con cada oferta que se le hizo a un chofer. */
export const ROUTE_BATCH_OFFER_STATUS: Map<RouteBatch['offers'][number]['status']> = {
  pending: { text: 'Esperando respuesta', tone: 'info' },
  accepted: { text: 'Aceptó', tone: 'success' },
  rejected: { text: 'Rechazó', tone: 'danger' },
  expired: { text: 'No respondió', tone: 'warn' },
};

/** Una oferta cerrada antes de su vencimiento sin que el chofer responda: se retiró (el lote se deshizo). */
export const isWithdrawn = (
  offer: Pick<RouteBatch['offers'][number], 'status' | 'expiresAt' | 'respondedAt'>,
): boolean =>
  offer.status === 'expired' && offer.respondedAt !== null && new Date(offer.respondedAt) < new Date(offer.expiresAt);

/** El estado de una oferta para mostrar: distingue la que venció de la que se retiró. */
export const offerLabel = (offer: RouteBatch['offers'][number]): Label =>
  isWithdrawn(offer) ? { text: 'Se retiró', tone: 'neutral' } : ROUTE_BATCH_OFFER_STATUS[offer.status];

/** Por qué se deshizo un lote. */
export const CLOSE_REASON: Record<NonNullable<RouteBatch['closeReason']>, string> = {
  exhausted: 'Ningún chofer lo tomó: los pedidos quedaron libres para el despacho',
  orders_unavailable: 'Quedó con menos de dos pedidos disponibles: los que sobraron quedaron libres para el despacho',
  admin: 'Lo deshizo un administrador (o se apagaron los recorridos): los pedidos quedaron libres para el despacho',
};

/** «25 kg». */
export const formatKg = (kg: number): string => `${formatNumber(kg)} kg`;

/** Las paradas que siguen en el lote, en orden de entrega. */
export const liveStops = (batch: Pick<RouteBatch, 'stops'>): RouteBatch['stops'] =>
  batch.stops.filter((s) => s.active).sort((a, b) => a.sequence - b.sequence);

/** Cuántas paradas tiene o tuvo el lote: en uno cerrado todas dejaron de estar vivas, pero fueron las suyas. */
export const stopCountOf = (batch: Pick<RouteBatch, 'status' | 'stops'>): number =>
  batch.status === 'dissolved' || batch.status === 'completed' ? batch.stops.length : liveStops(batch).length;

/** Un lote se puede deshacer mientras no tenga chofer. */
export const canDissolve = (status: RouteBatch['status']): boolean => status === 'forming' || status === 'offered';

const hourFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** «08:30»: la hora argentina de una llegada estimada. */
export const formatEta = (iso: string | null | undefined): string => (iso ? hourFormat.format(new Date(iso)) : '—');

/** «08:00 a 12:00» a partir de las horas «08:00:00» de la franja. */
export const formatSlot = (slot: RouteBatch['stops'][number]['slot']): string =>
  slot ? `${slot.name} · ${slot.startTime.slice(0, 5)} a ${slot.endTime.slice(0, 5)}` : 'Sin franja';

/** Las coordenadas de las paradas vivas que tienen ubicación, para dibujar el recorrido. */
export const routePoints = (
  batch: Pick<RouteBatch, 'stops'>,
): Array<{ position: [number, number]; sequence: number }> =>
  liveStops(batch).flatMap((s) =>
    s.address.latitude !== null && s.address.longitude !== null
      ? [{ position: [s.address.latitude, s.address.longitude] as [number, number], sequence: s.sequence }]
      : [],
  );
