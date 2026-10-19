import { ExternalLink, MapPin, Truck, UserRoundCog } from 'lucide-react';
import { Badge, Button } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { formatCurrency, formatElapsed, formatShortId, formatTime } from '../../../utils/format';
import { paymentStatusLabel, type Label } from '../../../utils/statusLabels';
import { stageStartedAt } from '../boardRules';
import { canAssignDriver } from './orderStatus';

/** «Cobro pendiente», «Cobro cobrado»…: sin el prefijo, «Pendiente» se confunde con la etapa del pedido. */
const paymentBadge = (status: NonNullable<Order['paymentStatus']>, method: Order['paymentMethodDetail']): Label => {
  const label = paymentStatusLabel(status, method);
  return { ...label, text: `Cobro ${label.text.toLowerCase()}` };
};

interface Props {
  order: Order;
  now: number;
  /** Sin él no se ofrece «Asignar chofer» (p. ej. sin distribuidora elegida: la API rechaza la escritura). */
  onAssign?: (order: Order) => void;
  onPreview: (order: Order) => void;
  onOpen: (order: Order) => void;
}

/** Tarjeta de un pedido en el tablero: quién, adónde, con qué chofer, hace cuánto está en esta etapa y cuánto. */
export const DispatchCard = ({ order, now, onAssign, onPreview, onOpen }: Props) => {
  const name = order.customer?.full_name ?? 'Cliente sin nombre';
  const address = [order.delivery_address?.street, order.delivery_address?.city].filter(Boolean).join(', ');
  const delivered = order.status === 'delivered';
  const stageAt = stageStartedAt(order);
  const canAssign = onAssign && canAssignDriver(order.status);

  return (
    <li className="rounded-xl border border-outline bg-surface p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onPreview(order)}
          aria-label={`Ver pedido ${formatShortId(order.order_id)} de ${name}`}
          className="min-w-0 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span className="block truncate text-[13px] font-semibold text-ink hover:text-primary">{name}</span>
          <span className="block font-mono text-[11.5px] text-muted">{formatShortId(order.order_id)}</span>
        </button>
        <span className="shrink-0 font-mono text-[13px] font-semibold text-ink">
          {formatCurrency(order.total_amount)}
        </span>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-[12px] text-ink-2">
        <MapPin aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0 text-muted" />
        <span className="min-w-0 [overflow-wrap:anywhere]">{address || 'Sin dirección'}</span>
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[12px]">
        <Truck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
        {order.delivery_name ? (
          <span className="min-w-0 truncate text-ink-2">{order.delivery_name}</span>
        ) : (
          <span className="font-medium text-warn">Sin chofer</span>
        )}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge
          label={{
            text: delivered ? `Entregado ${formatTime(stageAt)}` : formatElapsed(stageAt, now),
            tone: 'neutral',
          }}
        />
        {order.deliveryMode === 'express' && <Badge label={{ text: 'Express', tone: 'accent' }} />}
        {order.paymentStatus && <Badge label={paymentBadge(order.paymentStatus, order.paymentMethodDetail)} />}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-outline-soft pt-2.5">
        {canAssign && (
          <Button size="sm" variant="secondary" icon={<UserRoundCog />} onClick={() => onAssign(order)}>
            {order.delivery_id ? 'Reasignar' : 'Asignar'}
          </Button>
        )}
        <Button size="sm" variant="ghost" icon={<ExternalLink />} onClick={() => onOpen(order)}>
          Ver ficha
        </Button>
      </div>
    </li>
  );
};
