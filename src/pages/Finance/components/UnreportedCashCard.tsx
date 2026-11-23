import { HandCoins } from 'lucide-react';
import { Badge, Card, CardHeader, ErrorState } from '../../../common/components/ui';
import { useUnreportedCash } from '../../../services/queries/finance';
import { formatCurrency, formatDateTime, formatNumber } from '../../../utils/format';

const ageText = (hours: number) =>
  hours < 24 ? `${formatNumber(hours)} h` : `${formatNumber(Math.floor(hours / 24))} d ${formatNumber(hours % 24)} h`;

/**
 * El efectivo que los choferes cobraron en pedidos entregados y todavía no entró en una rendición, por chofer y con la
 * antigüedad del más viejo. Marca los que pasaron el umbral del aviso del cierre del día. Sin efectivo pendiente no se
 * dibuja.
 */
export const UnreportedCashCard = () => {
  const { data, error, refetch } = useUnreportedCash();
  if (error && !data)
    return <ErrorState error={error} resource="El efectivo sin rendir" onRetry={() => void refetch()} />;
  if (!data || data.items.length === 0) return null;

  const entregados = data.totalOrders === 1 ? 'pedido entregado' : 'pedidos entregados';
  const aviso = data.enabled
    ? `Se avisa al cierre del día lo que lleva más de ${formatNumber(data.minHours)} h.`
    : 'El aviso del cierre del día está apagado.';

  return (
    <Card className="p-5">
      <CardHeader
        icon={<HandCoins />}
        title="Efectivo cobrado y sin rendir"
        subtitle={`${formatCurrency(data.totalAmount)} en ${formatNumber(data.totalOrders)} ${entregados} que ninguna rendición tomó. ${aviso}`}
      />
      <ul className="divide-y divide-outline" aria-label="Efectivo sin rendir por chofer">
        {data.items.map((item) => (
          <li key={item.deliveryId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{item.driverName || 'Chofer'}</p>
              <p className="text-xs text-muted">
                {formatNumber(item.orders)} {item.orders === 1 ? 'pedido' : 'pedidos'} · el más viejo, del{' '}
                {formatDateTime(item.oldestDeliveredAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={{ text: `Hace ${ageText(item.ageHours)}`, tone: item.overdue ? 'danger' : 'neutral' }} />
              <span className="tabular-nums text-sm font-medium text-ink">{formatCurrency(item.amount)}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};
