import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Card, EmptyState } from '../../../common/components/ui';
import { cx } from '../../../common/components/ui/cx';
import type { Order } from '../../../services/api/types';
import { useOrders } from '../../../services/queries/orders';
import { useOrderStats } from '../../../services/queries/stats';
import { formatCurrency, formatNumber, formatShortId } from '../../../utils/format';
import { labelOf, ORDER_STATUS } from '../../../utils/statusLabels';

type Tab = 'recent' | 'pending' | 'accepted' | 'out_for_delivery';

const PAGE = { page: 0, pageSize: 6 };

const zoneText = (order: Order): string | null => {
  const zone = order.zone_surcharge;
  if (!zone) return null;
  return zone.type === 'percentage'
    ? `${zone.name} +${formatNumber(zone.value)} %`
    : `${zone.name} +${formatCurrency(zone.value)}`;
};

/** Los pedidos que se están moviendo, filtrados por estado en la API (GET /orders?status=). */
export const ActiveOrdersCard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('recent');
  const { data: stats } = useOrderStats();
  const { data, isFetching } = useOrders(PAGE, tab === 'recent' ? {} : { status: tab }, { refetchInterval: 15_000 });
  const orders = data?.orders ?? [];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'recent', label: 'Recientes' },
    { id: 'pending', label: 'Sin chofer', count: stats?.ordersSummary.pending },
    { id: 'accepted', label: 'Aceptados', count: stats?.ordersSummary.accepted },
    { id: 'out_for_delivery', label: 'En camino', count: stats?.ordersSummary.onTheWay },
  ];

  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-soft px-[18px] py-3.5">
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Pedidos</h2>
          <p className="text-xs text-muted">Se asignan solos al chofer libre más cercano.</p>
        </div>
        <div
          role="tablist"
          aria-label="Filtrar pedidos"
          className="flex max-w-full gap-0.5 overflow-x-auto rounded-[9px] bg-bg p-[3px]"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'shrink-0 whitespace-nowrap rounded-[7px] px-2.5 py-1 text-xs font-medium transition-colors',
                tab === t.id ? 'bg-surface text-ink shadow-control' : 'text-muted hover:text-ink',
              )}
            >
              {t.label}
              {t.count !== undefined && <b className="ml-1 font-semibold text-faint">{t.count}</b>}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        {orders.length === 0 ? (
          <EmptyState
            title={isFetching ? 'Cargando pedidos…' : 'No hay pedidos en este estado'}
            description={isFetching ? undefined : 'Cuando entre uno nuevo aparece acá solo.'}
          />
        ) : (
          <table className="w-full min-w-[600px] table-fixed text-[13px]">
            <thead className="bg-surface-sunken text-left text-[11.5px] text-muted">
              <tr>
                <th className="w-[30%] px-[18px] py-2.5 font-medium">Cliente</th>
                <th className="w-[26%] px-3 py-2.5 font-medium">Entrega</th>
                <th className="w-[17%] px-3 py-2.5 font-medium">Chofer</th>
                <th className="w-[14%] px-3 py-2.5 font-medium">Estado</th>
                <th className="w-[13%] px-[18px] py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-soft">
              {orders.map((order) => {
                const name = order.customer?.full_name ?? 'Cliente sin nombre';
                const zone = zoneText(order);
                return (
                  <tr
                    key={order.order_id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/orders/${order.order_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/orders/${order.order_id}`);
                    }}
                    className="cursor-pointer transition-colors hover:bg-surface-sunken"
                  >
                    <td className="px-[18px] py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={name} />
                        <span className="min-w-0">
                          <b className="block truncate font-semibold text-ink">{name}</b>
                          <span className="font-mono text-[11.5px] text-muted">{formatShortId(order.order_id)}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block truncate text-ink">
                        {order.delivery_address?.street ?? 'Sin dirección'}
                      </span>
                      {zone ? (
                        <span className="mt-0.5 inline-flex max-w-full truncate whitespace-nowrap rounded-md border border-outline-soft bg-bg px-1.5 py-px text-[11.5px] font-medium text-primary-strong">
                          {zone}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-muted">{order.delivery_address?.city ?? '—'}</span>
                      )}
                    </td>
                    <td className="truncate px-3 py-3" title={order.delivery_name ?? undefined}>
                      {order.delivery_name ?? <span className="font-medium text-warn">Sin asignar</span>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge label={labelOf(ORDER_STATUS, order.status)} />
                    </td>
                    <td className="whitespace-nowrap px-[18px] py-3 text-right font-mono font-semibold text-ink">
                      {formatCurrency(order.total_amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Link
        to="/orders"
        className="mt-auto flex items-center justify-center gap-1.5 border-t border-outline-soft py-2.5 text-[12.5px] font-semibold text-primary-strong transition-colors hover:bg-primary-soft"
      >
        Ver todos los pedidos <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
};
