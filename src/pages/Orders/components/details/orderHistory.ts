import type { FichaTimelineItem } from '../../../../common/components/ui';
import type { OrderStatusHistoryEntry } from '../../../../services/api/types';
import { labelOf, ORDER_STATUS } from '../../../../utils/statusLabels';
import { formatDateTime } from '../../../../utils/format';

type Status = OrderStatusHistoryEntry['toStatus'];
type Role = NonNullable<NonNullable<OrderStatusHistoryEntry['changedBy']>['role']>;

const TITLE: Record<Status, string> = {
  reserved: 'Reservado',
  pending: 'Pendiente',
  accepted: 'Aceptado',
  out_for_delivery: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const ROLE: Record<Role, string> = {
  customer: 'Cliente',
  delivery: 'Chofer',
  admin: 'Administrador',
  super_admin: 'Super administrador',
};

/** Quién hizo el cambio; sin actor lo hizo el sistema (vencimiento, webhook) o la cuenta ya no existe. */
const actorOf = (changedBy: OrderStatusHistoryEntry['changedBy']): string => {
  if (!changedBy) return 'Sistema';
  const role = changedBy.role ? ROLE[changedBy.role] : null;
  if (role && changedBy.fullName) return `${role}: ${changedBy.fullName}`;
  return role ?? changedBy.fullName ?? 'Sistema';
};

const titleOf = (entry: OrderStatusHistoryEntry): string => {
  if (entry.isNote) return 'Anotación';
  if (entry.fromStatus === null && entry.toStatus !== 'reserved') return 'Pedido creado';
  if (entry.toStatus === 'pending') return 'Vuelto a pendiente';
  return TITLE[entry.toStatus];
};

const noteOf = (entry: OrderStatusHistoryEntry): string | null => {
  if (entry.isNote) return entry.reason;
  if (entry.reason) return `Motivo: ${entry.reason}`;
  return entry.toStatus === 'cancelled' ? 'Sin motivo informado' : null;
};

/**
 * La línea de tiempo del pedido a partir de su historial real (`GET /orders/:id/status-history`): una entrada por
 * cada transición y por cada anotación (`isNote`, los cobros manuales), con quién y el motivo. La última transición
 * es el estado actual; las anotaciones no cambian el estado del pedido.
 */
export const buildOrderHistory = (entries: OrderStatusHistoryEntry[]): FichaTimelineItem[] => {
  let lastTransition = -1;
  entries.forEach((entry, index) => {
    if (!entry.isNote) lastTransition = index;
  });

  return entries.map((entry, index): FichaTimelineItem => {
    const isCurrent = index === lastTransition;
    const state: FichaTimelineItem['state'] = isCurrent
      ? entry.toStatus === 'cancelled'
        ? 'cancelled'
        : 'current'
      : 'done';
    return {
      id: entry.id,
      title: titleOf(entry),
      when: formatDateTime(entry.changedAt),
      actor: actorOf(entry.changedBy),
      note: noteOf(entry),
      state,
      tone: isCurrent ? labelOf(ORDER_STATUS, entry.toStatus).tone : undefined,
    };
  });
};
