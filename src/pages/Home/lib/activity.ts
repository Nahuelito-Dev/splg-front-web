import { CircleCheck, FilePlus2, MessageSquareWarning, ShieldAlert, UserCheck, type LucideIcon } from 'lucide-react';
import type { Claim, FleetExpirations, Order } from '../../../services/api/types';
import { formatCurrency, formatShortId } from '../../../utils/format';
import type { Tone } from '../../../utils/statusLabels';

export type ActivityKind = 'order_created' | 'order_accepted' | 'order_delivered' | 'claim' | 'expiration';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  /** Cuándo pasó (o cuándo vence), en ms. */
  at: number;
  title: string;
  detail: string;
  to: string;
  tone: Tone;
  icon: LucideIcon;
}

interface Sources {
  orders: Order[];
  claims: Claim[];
  expirations?: FleetExpirations;
  now: number;
}

const toMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const customerOf = (order: Order): string => order.customer?.full_name ?? 'Cliente sin nombre';

const orderEvents = (orders: Order[]): ActivityEvent[] =>
  orders.flatMap((order) => {
    const to = `/orders/${order.order_id}`;
    const short = formatShortId(order.order_id);
    const events: ActivityEvent[] = [];
    const created = toMs(order.created_at);
    if (created !== null) {
      events.push({
        id: `${order.order_id}:created`,
        kind: 'order_created',
        at: created,
        title: `Pedido ${short} creado`,
        detail: `${customerOf(order)} · ${formatCurrency(order.total_amount)}`,
        to,
        tone: 'info',
        icon: FilePlus2,
      });
    }
    const accepted = toMs(order.accepted_at);
    if (accepted !== null) {
      events.push({
        id: `${order.order_id}:accepted`,
        kind: 'order_accepted',
        at: accepted,
        title: `Pedido ${short} aceptado`,
        detail: order.delivery_name ? `Lo tomó ${order.delivery_name}` : customerOf(order),
        to,
        tone: 'primary',
        icon: UserCheck,
      });
    }
    const delivered = order.status === 'delivered' ? toMs(order.actual_delivery_date) : null;
    if (delivered !== null) {
      events.push({
        id: `${order.order_id}:delivered`,
        kind: 'order_delivered',
        at: delivered,
        title: `Pedido ${short} entregado`,
        detail: `${customerOf(order)} · ${formatCurrency(order.total_amount)}`,
        to,
        tone: 'success',
        icon: CircleCheck,
      });
    }
    return events;
  });

const claimEvents = (claims: Claim[]): ActivityEvent[] =>
  claims.flatMap((claim) => {
    const at = toMs(claim.createdAt);
    if (at === null) return [];
    return [
      {
        id: `${claim.claim_id}:claim`,
        kind: 'claim' as const,
        at,
        title: `Reclamo: ${claim.reason}`,
        detail: claim.customer?.full_name ?? `Pedido ${formatShortId(claim.order_id)}`,
        to: '/claims',
        tone: 'danger' as const,
        icon: MessageSquareWarning,
      },
    ];
  });

/** Los vencimientos de flota que ya pasaron o están por pasar, lo más urgente primero. */
const expirationEvents = (expirations: FleetExpirations | undefined, now: number): ActivityEvent[] => {
  if (!expirations) return [];
  const owners = [
    ...expirations.vehicles.map((vehicle) => ({
      id: vehicle.carId,
      name: vehicle.carPatent ?? ([vehicle.carBrand, vehicle.carModel].filter(Boolean).join(' ') || 'Vehículo'),
      items: vehicle.items,
    })),
    ...expirations.drivers.map((driver) => ({
      id: driver.deliveryId,
      name: driver.fullName ?? 'Chofer',
      items: driver.items,
    })),
  ];
  return owners
    .flatMap((owner) =>
      owner.items
        .filter((item) => item.expirationStatus !== 'current' && toMs(item.dueAt) !== null)
        .map((item) => ({ owner, item })),
    )
    .sort((a, b) => (a.item.daysUntilDue ?? 0) - (b.item.daysUntilDue ?? 0))
    .map(({ owner, item }): ActivityEvent => {
      const expired = item.expirationStatus === 'expired';
      return {
        id: `${owner.id}:${item.taskId}`,
        kind: 'expiration',
        at: toMs(item.dueAt) ?? now,
        title: `${item.planName}: ${owner.name}`,
        detail: expired ? 'Vencido' : 'Por vencer',
        to: '/fleet/expirations',
        tone: expired ? 'danger' : 'warn',
        icon: ShieldAlert,
      };
    });
};

const MAX_EXPIRATIONS = 2;

/**
 * La actividad del tablero, de lo más reciente a lo más viejo: pedidos creados,
 * aceptados y entregados, reclamos nuevos y los vencimientos de flota más
 * urgentes (siempre hay lugar para ellos aunque los pedidos sean muchos).
 */
export const buildActivity = ({ orders, claims, expirations, now }: Sources, limit = 8): ActivityEvent[] => {
  const alerts = expirationEvents(expirations, now).slice(0, MAX_EXPIRATIONS);
  const events = [...orderEvents(orders), ...claimEvents(claims)]
    .filter((event) => event.at <= now)
    .sort((a, b) => b.at - a.at)
    .slice(0, Math.max(0, limit - alerts.length));
  return [...events, ...alerts].sort((a, b) => b.at - a.at);
};
