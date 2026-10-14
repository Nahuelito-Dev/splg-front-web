import type { FichaTimelineItem } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { labelOf, ORDER_STATUS } from '../../../../utils/statusLabels';
import { formatCurrency, formatDateTime, formatDay } from '../../../../utils/format';

type Milestone = 'created' | 'reserved' | 'accepted' | 'on_the_way' | 'delivered' | 'cancelled';

/** Orden del recorrido normal; `created` y `reserved` comparten el rango 0 (la reserva nace con el pedido). */
const RANK: Record<Milestone, number> = {
  created: 0,
  reserved: 0,
  accepted: 1,
  on_the_way: 2,
  delivered: 3,
  cancelled: 4,
};

/** El hito en el que está el pedido según el estado que devuelve la API. */
const CURRENT: Record<Order['status'], Milestone> = {
  reserved: 'reserved',
  pending: 'created',
  accepted: 'accepted',
  out_for_delivery: 'on_the_way',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

/** Quién canceló, según `cancelledBy` (el super admin cuenta como administrador; `system` es un vencimiento). */
const CANCELLED_BY: Record<NonNullable<Order['cancelledBy']>, string> = {
  customer: 'Cancelado por el cliente',
  admin: 'Cancelado por un administrador',
  driver: 'Cancelado por el chofer',
  system: 'Cancelado por el sistema',
};

/** Qué dejó anotado el administrador al cobrar o dar de baja un pago, según el pago en que quedó el pedido. */
const PAYMENT_NOTE_TITLE: Partial<Record<NonNullable<Order['paymentStatus']>, string>> = {
  paid: 'Cobro registrado',
  failed: 'Transferencia no recibida',
  written_off: 'Impago dado por perdido',
};

interface MilestoneDraft extends Omit<FichaTimelineItem, 'state' | 'id'> {
  id: Milestone;
  /** Si el pedido tiene algún dato de este hito (o lo alcanzó). */
  hasData: boolean;
}

/**
 * Los hitos del pedido, armados con los campos de fecha que trae la API
 * (`created_at`, `scheduledDate`, `accepted_at`, `on_the_way_at`,
 * `actual_delivery_date`). No hay historial de estados ni fecha de llegada ni
 * de cancelación: esos hitos se muestran sin hora o no se muestran.
 */
export const buildOrderHistory = (order: Order): FichaTimelineItem[] => {
  const current = CURRENT[order.status];
  const driver = order.delivery_name ? `Chofer: ${order.delivery_name}` : null;
  const cancelled = order.status === 'cancelled';
  const { tone } = labelOf(ORDER_STATUS, order.status);

  const milestones: MilestoneDraft[] = [
    {
      id: 'created',
      title: 'Pedido creado',
      when: formatDateTime(order.created_at),
      actor: order.customer?.full_name ? `Cliente: ${order.customer.full_name}` : null,
      hasData: true,
    },
    {
      id: 'reserved',
      title: 'Reservado',
      note: order.scheduledDate
        ? `Reservado para ${formatDay(order.scheduledDate)}${(order.depositAmount ?? 0) > 0 ? ` · seña ${formatCurrency(order.depositAmount)}` : ''}`
        : null,
      hasData: Boolean(order.scheduledDate) || order.status === 'reserved',
    },
    {
      id: 'accepted',
      title: 'Aceptado',
      when: formatDateTime(order.accepted_at),
      actor: driver,
      hasData: Boolean(order.accepted_at),
    },
    {
      id: 'on_the_way',
      title: 'En camino',
      when: formatDateTime(order.on_the_way_at),
      actor: driver,
      hasData: Boolean(order.on_the_way_at),
    },
    {
      id: 'delivered',
      title: 'Entregado',
      when: formatDateTime(order.actual_delivery_date),
      actor: driver,
      hasData: Boolean(order.actual_delivery_date),
    },
    {
      id: 'cancelled',
      title: 'Cancelado',
      actor: order.cancelledBy ? CANCELLED_BY[order.cancelledBy] : null,
      note: order.cancellation_reason ? `Motivo: ${order.cancellation_reason}` : 'Sin motivo informado',
      hasData: cancelled,
    },
  ];

  const items = milestones
    .filter((m) => {
      if (m.id === 'cancelled') return cancelled;
      if (m.id === 'reserved') return m.hasData;
      // Un pedido cancelado sólo muestra los hitos que alcanzó.
      return !cancelled || m.hasData;
    })
    .map((m): FichaTimelineItem => {
      const reached = RANK[m.id] <= RANK[current];
      const state: FichaTimelineItem['state'] =
        m.id === current ? (cancelled ? 'cancelled' : 'current') : reached ? 'done' : 'pending';
      return {
        id: m.id,
        title: m.title,
        when: state === 'pending' ? null : m.when,
        actor: m.actor,
        note: m.note,
        state,
        tone: state === 'current' || state === 'cancelled' ? tone : undefined,
      };
    });

  // El cobro manual no cambia el estado del pedido: es una anotación, no un hito del recorrido.
  const paymentTitle = order.paymentStatus ? PAYMENT_NOTE_TITLE[order.paymentStatus] : undefined;
  if (paymentTitle && order.paymentResolvedAt && order.paymentResolutionNote) {
    items.push({
      id: 'payment-note',
      title: paymentTitle,
      when: formatDateTime(order.paymentResolvedAt),
      note: order.paymentResolutionNote,
      state: 'done',
    });
  }
  return items;
};
