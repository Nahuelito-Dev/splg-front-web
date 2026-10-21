import { useEffect, useMemo, useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { Card, ErrorState, PageHeader, PageContainer } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { Incident, Order } from '../../services/api/types';
import { useIncidents } from '../../services/queries/incidents';
import { useOrders } from '../../services/queries/orders';
import { errorMessage } from '../../services/api/errors';
import { formatCurrency } from '../../utils/format';
import { ResolveUnpaidModal } from '../Orders/components/ResolveUnpaidModal';
import { UnpaidCollectionsTable } from './UnpaidCollectionsTable';

/** De cada pedido, su incidencia de cobro impago: la abierta si hay, y si no la más reciente. */
const unpaidIncidentsByOrder = (incidents: Incident[] | undefined): Map<string, Incident> => {
  const byOrder = new Map<string, Incident>();
  for (const incident of incidents ?? []) {
    if (incident.type !== 'unpaid_collection') continue;
    const current = byOrder.get(incident.order_id);
    const better = !current || (incident.status === 'open' && current.status !== 'open');
    if (better) byOrder.set(incident.order_id, incident);
  }
  return byOrder;
};

/** Cobros impagos: los pedidos en efectivo que el chofer no pudo cobrar, con su incidencia y la acción para resolverlos. */
export const UnpaidCollections = () => {
  const navigate = useNavigate();
  const { canOperate } = usePermissions();
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [resolving, setResolving] = useState<Order | null>(null);
  const { data, isFetching, error, refetch } = useOrders(pagination, { paymentStatus: 'unpaid' });
  const incidents = useIncidents();
  // Si al resolver el último de una página ésta queda vacía pero quedan impagos, se vuelve a la anterior.
  const emptyPage = data !== undefined && data.orders.length === 0 && data.total > 0 && pagination.page > 0;
  useEffect(() => {
    if (!emptyPage || !data) return;
    const lastPage = Math.max(0, Math.ceil(data.total / pagination.pageSize) - 1);
    setPagination((current) => ({ ...current, page: Math.min(current.page - 1, lastPage) }));
  }, [emptyPage, data, pagination.pageSize]);
  const incidentByOrder = useMemo(() => unpaidIncidentsByOrder(incidents.data), [incidents.data]);
  const pageTotal = (data?.orders ?? []).reduce((acc, order) => acc + Number(order.total_amount), 0);

  return (
    <PageContainer>
      <PageHeader
        title="Cobros impagos"
        description="Pedidos en efectivo que el chofer informó como no cobrados. Resolvelos como cobrados más tarde o dalos por perdidos."
      />
      <Card>
        {incidents.isError && (
          <p role="alert" className="border-b border-outline px-4 py-3 text-sm text-danger">
            No se pudieron cargar las incidencias: {errorMessage(incidents.error)}{' '}
            <button type="button" className="font-semibold underline" onClick={() => void incidents.refetch()}>
              Reintentar
            </button>
          </p>
        )}
        {error ? (
          <ErrorState error={error} resource="Los cobros impagos" onRetry={() => void refetch()} />
        ) : (
          <>
            <p className="px-4 py-3 text-sm text-muted" aria-live="polite">
              {data ? (
                <>
                  <b className="font-semibold text-ink">{data.total}</b>{' '}
                  {data.total === 1 ? 'pedido impago' : 'pedidos impagos'}
                  {data.total > 0 && <> · {formatCurrency(pageTotal)} en esta página</>}
                </>
              ) : (
                'Cargando cobros impagos…'
              )}
            </p>
            <UnpaidCollectionsTable
              rows={data?.orders ?? []}
              total={data?.total ?? 0}
              loading={isFetching}
              pagination={pagination}
              onPaginationChange={setPagination}
              incidentByOrder={incidentByOrder}
              incidentsError={incidents.isError}
              onView={(order) => navigate(`/orders/${order.order_id}`)}
              onResolve={canOperate ? setResolving : undefined}
            />
          </>
        )}
      </Card>
      <ResolveUnpaidModal open={resolving !== null} onClose={() => setResolving(null)} order={resolving} />
    </PageContainer>
  );
};
