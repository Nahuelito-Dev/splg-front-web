import type { RouteBatch, RouteBatchRun } from '../../services/api/types';
import type { Label } from '../../utils/statusLabels';
import { formatNumber } from '../../utils/format';

type Map<K extends string> = Record<K, Label>;

/** En qué va un lote de recorrido (CU-107). */
export const ROUTE_BATCH_STATUS: Map<RouteBatch['status']> = {
  forming: { text: 'Armándose', tone: 'neutral' },
  offered: { text: 'Ofrecido', tone: 'info' },
  draft: { text: 'Borrador', tone: 'neutral' },
  confirmed: { text: 'Confirmado', tone: 'info' },
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
  day_closed: 'Se cerró el día con la hoja todavía en borrador: los pedidos quedaron libres para el despacho',
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

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Lo que el diálogo cuenta de los pedidos que quedaron sin lote; los motivos por chofer los redacta el back. */
const unplacedDetail = ({ reasons, driversNotEligibleDetail: detail }: RouteBatchRun) => {
  const drivers = detail.map((d) => (d.reasons.length > 0 ? `${d.driverName}: ${d.reasons.join(', ')}` : d.driverName));
  const lines: string[] = [];
  if (drivers.length === 0 && reasons.driversNotEligible > 0) {
    lines.push('Los choferes cercanos no pueden recibir un lote ahora');
  }
  if (reasons.noDriversNearby > 0) lines.push('No hay choferes de la distribuidora cerca de los pedidos');
  if (reasons.notEnoughStops > 0) {
    lines.push('Los pedidos cercanos no llegan a 2 paradas por radio, franja o capacidad del vehículo');
  }
  if (reasons.lockConflict > 0) lines.push('Otro proceso tomó los pedidos mientras se armaba');
  return { driversTitle: 'Choferes que no pueden recibir el lote', drivers, lines };
};

export interface RunDialog {
  title: string;
  summary: string;
  driversTitle: string;
  drivers: string[];
  lines: string[];
}

export type RunNotice =
  { kind: 'toast'; level: 'success' | 'info'; message: string } | ({ kind: 'dialog' } & RunDialog);

/** El resultado de «Armar ahora»: aviso corto si se armó todo o no había nada, diálogo con los motivos si quedó algo sin lote. */
export const describeRun = (run: RouteBatchRun): RunNotice => {
  if (run.candidates === 0) {
    return { kind: 'toast', level: 'info', message: 'No hay pedidos programados para agrupar' };
  }
  const unplaced = run.candidates - run.orders;
  const candidates = plural(run.candidates, 'pedido candidato', 'pedidos candidatos');
  if (run.batches > 0 && unplaced <= 0) {
    return {
      kind: 'toast',
      level: 'success',
      message: `${run.batches} lote(s) armado(s) con ${run.orders} pedido(s) de ${candidates}`,
    };
  }
  const detail = unplacedDetail(run);
  if (run.batches > 0) {
    return {
      kind: 'dialog',
      title: 'Lote armado en parte',
      summary: `${run.batches} lote(s) armado(s) con ${run.orders} pedido(s) de ${candidates}. ${plural(unplaced, 'pedido quedó', 'pedidos quedaron')} sin lote.`,
      ...detail,
    };
  }
  return { kind: 'dialog', title: 'No se armó ningún lote', summary: `Había ${candidates}.`, ...detail };
};
