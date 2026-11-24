import type { FailedVisit, FailedVisitOrder, RevisitDay } from '../../services/api/types';
import { formatDay } from '../../utils/format';
import { REVISIT_STATUS, labelOf, type Label } from '../../utils/statusLabels';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** «09:00» de un «09:00:00» de la API. */
export const shortTime = (time: string | null | undefined): string => (time ? time.slice(0, 5) : '');

/** «jueves 26 nov 2026»: el día de la semana ayuda a coordinar con el cliente. */
export const weekdayDay = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${formatDay(day)}`;
};

/** «jueves 26 nov 2026 · Mañana (09:00 a 13:00)», o sólo el día si no tiene franja. */
export const revisitWhen = (visit: {
  scheduledDate: string | null;
  timeSlotName: string | null;
  windowStart: string | null;
  windowEnd: string | null;
}): string | null => {
  if (!visit.scheduledDate) return null;
  const day = weekdayDay(visit.scheduledDate);
  if (!visit.windowStart || !visit.windowEnd) return day;
  const window = `${shortTime(visit.windowStart)} a ${shortTime(visit.windowEnd)}`;
  return `${day} · ${visit.timeSlotName ? `${visit.timeSlotName} (${window})` : window}`;
};

/** Lo que se ve de la nueva visita de un pedido del listado; con la decisión en el admin todavía no hay fecha. */
export const orderRevisitWhen = (order: FailedVisitOrder): string | null =>
  order.revisitStatus === 'awaiting_admin' ? null : revisitWhen(order);

/** El admin puede fijar la visita mientras el pedido siga pendiente y con una nueva visita abierta. */
export const canScheduleRevisit = (order: Pick<FailedVisitOrder, 'orderStatus' | 'revisitStatus'>): boolean =>
  order.orderStatus === 'pending' && order.revisitStatus !== null;

/** «a 35 m del domicilio», o nada si la visita se informó sin ubicación. */
export const distanceText = (meters: number | null): string | null =>
  meters === null ? null : `a ${Math.round(meters)} m del domicilio`;

/** El día y la franja que propuso el sistema o acordó el chofer en una visita. */
export const proposalText = (visit: FailedVisit): string | null => {
  if (!visit.proposedDate) return null;
  const day = weekdayDay(visit.proposedDate);
  return visit.proposedTimeSlotName ? `${day} · ${visit.proposedTimeSlotName}` : day;
};

const RESOLUTION: Record<NonNullable<FailedVisit['resolution']>, string> = {
  customer_accepted: 'El cliente aceptó',
  customer_changed: 'El cliente eligió',
  admin_set: 'La distribuidora fijó',
};

/** «El cliente eligió jueves 26 nov 2026 · Tarde»: cómo se cerró la propuesta de una visita. */
export const resolutionText = (visit: FailedVisit): string | null => {
  if (!visit.resolution) return null;
  const what = RESOLUTION[visit.resolution];
  if (!visit.finalDate) return what;
  const day = weekdayDay(visit.finalDate);
  return `${what} ${visit.finalTimeSlotName ? `${day} · ${visit.finalTimeSlotName}` : day}`;
};

/** Las franjas del día elegido, como opciones del selector (con los cupos que quedan). */
export const slotOptions = (days: RevisitDay[], day: string) =>
  (days.find((d) => d.date === day)?.slots ?? []).map((slot) => ({
    value: slot.timeSlotId,
    label: `${slot.name} · ${shortTime(slot.startTime)} a ${shortTime(slot.endTime)} (${slot.remaining} ${slot.remaining === 1 ? 'lugar' : 'lugares'})`,
  }));

/** Pedido cerrado (cancelado o entregado): su nueva visita ya no corre. */
export const isClosedOrder = (order: Pick<FailedVisitOrder, 'orderStatus'>): boolean =>
  order.orderStatus === 'cancelled' || order.orderStatus === 'delivered';

/**
 * La etiqueta de la nueva visita en el listado y el detalle. Con el pedido cerrado manda el estado del pedido, en
 * tono neutro: un cancelado no muestra «Confirmada». `null` si el pedido no tiene nueva visita.
 */
export const revisitBadge = (order: Pick<FailedVisitOrder, 'orderStatus' | 'revisitStatus'>): Label | null => {
  if (order.orderStatus === 'cancelled') return { text: 'Pedido cancelado', tone: 'neutral' };
  if (order.orderStatus === 'delivered') return { text: 'Entregado', tone: 'neutral' };
  return order.revisitStatus ? labelOf(REVISIT_STATUS, order.revisitStatus) : null;
};
