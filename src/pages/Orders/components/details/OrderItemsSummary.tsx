import { Badge, Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { formatCurrency } from '../../../../utils/format';
import { labelOf, PAYMENT_TYPE } from '../../../../utils/statusLabels';
import { onlinePaymentSurcharge } from './orderPricing';

export const OrderItemsSummary = ({ order }: { order: Order }) => {
  const onlineSurcharge = onlinePaymentSurcharge(order);

  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-hover text-xs uppercase text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 text-center font-medium">Cant.</th>
            <th className="px-4 py-3 text-right font-medium">Precio unit.</th>
            <th className="px-4 py-3 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline">
          {order.order_items.map((item, index) => (
            <tr key={`${item.gas_cylinder?.gas_cylinder_id ?? 'item'}-${index}`}>
              <td className="px-4 py-3 font-medium text-ink">{item.gas_cylinder?.type ?? 'Producto sin datos'}</td>
              <td className="px-4 py-3 text-center text-muted">{item.quantity}</td>
              <td className="px-4 py-3 text-right text-muted">{formatCurrency(item.gas_cylinder?.price)}</td>
              <td className="px-4 py-3 text-right font-semibold text-ink">
                {formatCurrency(item.gas_cylinder ? item.gas_cylinder.price * item.quantity : null)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-outline bg-surface-hover">
          <tr>
            <td colSpan={3} className="px-4 py-2 text-right text-muted">
              Subtotal garrafas
            </td>
            <td className="px-4 py-2 text-right text-ink">{formatCurrency(order.subtotal_items)}</td>
          </tr>
          {order.zone_surcharge && (
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-muted">
                Recargo por zona «{order.zone_surcharge.name}» (
                {order.zone_surcharge.type === 'percentage'
                  ? `${order.zone_surcharge.value} %`
                  : formatCurrency(order.zone_surcharge.value)}
                )
              </td>
              <td className="px-4 py-2 text-right text-ink">{formatCurrency(order.zone_surcharge.amount)}</td>
            </tr>
          )}
          {onlineSurcharge > 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-muted">
                Recargo por pago online
              </td>
              <td className="px-4 py-2 text-right text-ink">{formatCurrency(onlineSurcharge)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right font-semibold text-muted">
              Total
            </td>
            <td className="px-4 py-3 text-right text-lg font-bold text-ink">{formatCurrency(order.total_amount)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="px-4 pb-3 text-right">
              <Badge label={labelOf(PAYMENT_TYPE, order.payment_method)} />
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
};
