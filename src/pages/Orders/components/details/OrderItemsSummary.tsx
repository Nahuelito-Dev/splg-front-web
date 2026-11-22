import { Flame } from 'lucide-react';
import { Badge, Card, CardHeader, PhotoThumb } from '../../../../common/components/ui';
import type { Order, OrderItem } from '../../../../services/api/types';
import { formatCurrency } from '../../../../utils/format';
import { labelOf, PAYMENT_METHOD } from '../../../../utils/statusLabels';
import {
  containerChargeLabel,
  containersChargedCount,
  orderSurchargeLabel,
  paymentSurchargeAmount,
} from './orderPricing';

const TotalRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className={strong ? 'font-semibold text-ink' : 'text-muted'}>{label}</dt>
    <dd className={strong ? 'text-lg font-bold text-ink' : 'text-ink'}>{value}</dd>
  </div>
);

/** Vacías que el chofer declaró haber recibido; sin declaración o sin vacías esperadas no hay línea. */
const EmptiesReceivedLine = ({ item }: { item: OrderItem }) => {
  const { emptiesExpected: expected, emptiesReceived: received } = item;
  if (received == null || !expected) return null;
  return (
    <p className={received < expected ? 'text-xs font-semibold text-warn' : 'text-xs text-muted'}>
      Vacías: recibidas {received} de {expected}
    </p>
  );
};

/** Ítems del pedido con su garrafa, cantidades y totales, y el desglose de recargos como resumen. */
export const OrderItemsSummary = ({ order }: { order: Order }) => {
  const surcharge = paymentSurchargeAmount(order);
  const zone = order.zone_surcharge;

  return (
    <Card>
      <CardHeader
        title="Detalle"
        action={<Badge label={labelOf(PAYMENT_METHOD, order.paymentMethodDetail)} />}
        className="p-5 pb-3"
      />

      <ul className="px-5">
        {order.order_items.map((item, index) => {
          const cylinder = item.gas_cylinder;
          return (
            <li
              key={`${cylinder?.gas_cylinder_id ?? 'item'}-${index}`}
              className="flex items-center gap-3 border-t border-dashed border-outline py-3.5"
            >
              <PhotoThumb
                kind="gasCylinder"
                id={cylinder?.gas_cylinder_id ?? ''}
                url={cylinder?.photoUrl}
                size="lg"
                shape="square"
                className="!h-12 !w-12"
                fallback={
                  <span
                    aria-hidden="true"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent-soft text-on-accent"
                  >
                    <Flame className="h-6 w-6" strokeWidth={1.6} />
                  </span>
                }
              />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium text-ink">{cylinder?.type ?? 'Producto sin datos'}</p>
                <p className="text-xs text-muted">
                  {item.quantity} × {formatCurrency(item.unit_price)}
                  {cylinder?.description ? ` · ${cylinder.description}` : ''}
                </p>
                <EmptiesReceivedLine item={item} />
              </div>
              <p className="shrink-0 font-semibold text-ink">{formatCurrency(item.subtotal)}</p>
            </li>
          );
        })}
      </ul>

      <dl className="space-y-2 border-t border-dashed border-outline p-5 text-[13px]">
        <TotalRow label="Subtotal garrafas" value={formatCurrency(order.subtotal_items)} />
        {order.containerChargeAmount > 0 && (
          <TotalRow
            label={containerChargeLabel(containersChargedCount(order.order_items))}
            value={formatCurrency(order.containerChargeAmount)}
          />
        )}
        {zone && zone.amount > 0 && (
          <TotalRow
            label={`Recargo por zona «${zone.name}»${zone.type === 'percentage' ? ` (${zone.value} %)` : ''}`}
            value={formatCurrency(zone.amount)}
          />
        )}
        {order.deliveryMode === 'express' && order.expressSurchargeAmount > 0 && (
          <TotalRow label="Recargo express" value={formatCurrency(order.expressSurchargeAmount)} />
        )}
        {surcharge > 0 && <TotalRow label={orderSurchargeLabel(order)} value={formatCurrency(surcharge)} />}
        <TotalRow label="Total" value={formatCurrency(order.total_amount)} strong />
      </dl>
    </Card>
  );
};
