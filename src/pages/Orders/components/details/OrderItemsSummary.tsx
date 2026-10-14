import { Flame } from 'lucide-react';
import { Badge, Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { formatCurrency } from '../../../../utils/format';
import { labelOf, PAYMENT_METHOD } from '../../../../utils/statusLabels';
import { onlinePaymentSurcharge } from './orderPricing';

const TotalRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className={strong ? 'font-semibold text-ink' : 'text-muted'}>{label}</dt>
    <dd className={strong ? 'text-lg font-bold text-ink' : 'text-ink'}>{value}</dd>
  </div>
);

/** Ítems del pedido con su garrafa, cantidades y totales, y el desglose de recargos como resumen. */
export const OrderItemsSummary = ({ order }: { order: Order }) => {
  const onlineSurcharge = onlinePaymentSurcharge(order);
  const zone = order.zone_surcharge;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 p-5 pb-3">
        <h2 className="text-base font-semibold text-ink">Detalle</h2>
        <Badge label={labelOf(PAYMENT_METHOD, order.paymentMethodDetail)} />
      </div>

      <ul className="px-5">
        {order.order_items.map((item, index) => {
          const cylinder = item.gas_cylinder;
          return (
            <li
              key={`${cylinder?.gas_cylinder_id ?? 'item'}-${index}`}
              className="flex items-center gap-3 border-t border-dashed border-outline py-3.5"
            >
              <span
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent-soft text-on-accent"
              >
                <Flame className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium text-ink">{cylinder?.type ?? 'Producto sin datos'}</p>
                <p className="text-xs text-muted">
                  {item.quantity} × {formatCurrency(item.unit_price)}
                  {cylinder?.description ? ` · ${cylinder.description}` : ''}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-ink">{formatCurrency(item.subtotal)}</p>
            </li>
          );
        })}
      </ul>

      <dl className="space-y-2 border-t border-dashed border-outline p-5 text-[13px]">
        <TotalRow label="Subtotal garrafas" value={formatCurrency(order.subtotal_items)} />
        {zone && zone.amount > 0 && (
          <TotalRow
            label={`Recargo por zona «${zone.name}»${zone.type === 'percentage' ? ` (${zone.value} %)` : ''}`}
            value={formatCurrency(zone.amount)}
          />
        )}
        {onlineSurcharge > 0 && <TotalRow label="Recargo por pago online" value={formatCurrency(onlineSurcharge)} />}
        <TotalRow label="Total" value={formatCurrency(order.total_amount)} strong />
      </dl>
    </Card>
  );
};
