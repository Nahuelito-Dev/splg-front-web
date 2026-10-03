import { TableroBarList, TableroWidget, type TableroBarItem } from '../../../common/components/ui';
import { useOrders } from '../../../services/queries/orders';
import { useSalesByPayment } from '../../../services/queries/reports';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { NO_ZONE, ordersByZone, paymentShares } from '../lib/distribution';
import { dayKey, dayRange } from '../lib/series';

const WINDOW_DAYS = 30;
/** El máximo que admite la API por página. */
const PAGE = { page: 0, pageSize: 100 };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="grid gap-3">
    <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
    {children}
  </section>
);

/** Reparto de los últimos 30 días por zona de cobertura y por método de pago. */
export const DistributionCard = () => {
  const range = dayRange(dayKey(new Date()), WINDOW_DAYS);
  const orders = useOrders(PAGE, range);
  const payments = useSalesByPayment(range);

  const zones = ordersByZone(orders.data?.orders ?? []);
  const sampled = (orders.data?.total ?? 0) > (orders.data?.orders.length ?? 0);
  const zoneItems: TableroBarItem[] = zones.slice(0, 5).map((zone) => ({
    id: zone.name,
    label: zone.name,
    value: zone.orders,
    valueLabel: formatNumber(zone.orders),
    tone: zone.name === NO_ZONE ? 'neutral' : 'primary',
  }));
  const shares = paymentShares(payments.data ?? []);
  const paymentItems: TableroBarItem[] = shares.map((share) => ({
    id: share.method,
    label: share.label,
    value: share.sales,
    valueLabel: formatCurrency(share.sales),
    hint: `${formatNumber(share.orders)} pedidos`,
    tone: 'info',
  }));

  return (
    <TableroWidget
      title="Distribución"
      subtitle="Por zona de cobertura y método de pago, últimos 30 días."
      loading={orders.isLoading || payments.isLoading}
      error={orders.error ?? payments.error}
      onRetry={() => {
        void orders.refetch();
        void payments.refetch();
      }}
      empty={zones.length === 0 && shares.length === 0 ? { title: 'Sin pedidos en el período' } : null}
    >
      <div className="grid gap-6">
        <Section title="Pedidos por zona">
          {zoneItems.length ? (
            <>
              <TableroBarList label="Pedidos por zona" items={zoneItems} />
              {sampled && <p className="text-[11.5px] text-muted">Sobre los {PAGE.pageSize} pedidos más recientes.</p>}
            </>
          ) : (
            <p className="text-xs text-muted">Sin pedidos en el período.</p>
          )}
        </Section>
        <Section title="Ventas por método de pago">
          {paymentItems.length ? (
            <TableroBarList label="Ventas por método de pago" items={paymentItems} />
          ) : (
            <p className="text-xs text-muted">Sin ventas en el período.</p>
          )}
        </Section>
      </div>
    </TableroWidget>
  );
};
