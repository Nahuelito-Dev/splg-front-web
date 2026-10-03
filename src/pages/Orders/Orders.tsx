import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { CirclePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, FilterChips, PageHeader, tabPanelProps, type FilterChip } from '../../common/components/ui';
import { useDebounce } from '../../hooks';
import type { Order } from '../../services/api/types';
import { useAssignOrderDelivery, useCancelOrder, useOrderStatusCounts, useOrders } from '../../services/queries/orders';
import { notify } from '../../utils/notifications';
import { AssignDriverModal } from './components/AssignDriverModal';
import { CancelOrderModal } from './components/CancelOrderModal';
import { EMPTY_TOOLBAR_FILTERS, isInvertedRange, type OrdersToolbarFilters } from './components/ordersFilterValues';
import { ORDER_TABS_ID, OrderStatusTabs } from './components/OrderStatusTabs';
import { OrdersFilters } from './components/OrdersFilters';
import { OrdersTable } from './components/OrdersTable';

// Ver el detalle de un pedido navega a su ficha (`/orders/:id`); acá sólo
// quedan las acciones rápidas de la tabla (asignar y cancelar).
type ModalState = { kind: 'closed' } | { kind: 'assign'; order: Order } | { kind: 'cancel'; order: Order };

export const Orders = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Order['status'] | ''>('');
  const [toolbar, setToolbar] = useState<OrdersToolbarFilters>(EMPTY_TOOLBAR_FILTERS);
  const debouncedSearch = useDebounce(toolbar.search.trim());
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });

  const { counts, total: totalAll } = useOrderStatusCounts();
  const invertedRange = isInvertedRange(toolbar);
  const { data, isFetching } = useOrders(pagination, {
    search: debouncedSearch,
    status: status || undefined,
    from: invertedRange ? '' : toolbar.from,
    to: invertedRange ? '' : toolbar.to,
  });
  const assignDelivery = useAssignOrderDelivery();
  const cancelOrderMutation = useCancelOrder();

  const handleStatus = (value: Order['status'] | '') => {
    setStatus(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const handleToolbar = (values: OrdersToolbarFilters) => {
    setToolbar(values);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const chips: FilterChip[] = [];
  if (toolbar.search) chips.push({ key: 'search', label: `"${toolbar.search}"` });
  if (toolbar.from) chips.push({ key: 'from', label: `Desde ${toolbar.from}` });
  if (toolbar.to) chips.push({ key: 'to', label: `Hasta ${toolbar.to}` });

  const removeChip = (key: string) => {
    if (key === 'search') handleToolbar({ ...toolbar, search: '' });
    else if (key === 'from') handleToolbar({ ...toolbar, from: '' });
    else if (key === 'to') handleToolbar({ ...toolbar, to: '' });
  };

  const closeModal = () => setModal({ kind: 'closed' });

  const handleAssign = (deliveryId: string) => {
    if (modal.kind !== 'assign') return;
    assignDelivery.mutate(
      { id: modal.order.order_id, deliveryId },
      {
        onSuccess: () => {
          notify.success('Pedido asignado');
          closeModal();
        },
        onError: notify.error,
      },
    );
  };

  const handleCancel = (reason: string) => {
    if (modal.kind !== 'cancel') return;
    cancelOrderMutation.mutate(
      { id: modal.order.order_id, body: { reason: reason || undefined } },
      {
        onSuccess: () => {
          notify.success('Pedido cancelado');
          closeModal();
        },
        onError: notify.error,
      },
    );
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Pedidos"
        description="Pedidos en curso y su historial. La asignación de chofer es automática; acá se puede forzar o cancelar."
        actions={
          <Button icon={<CirclePlus />} onClick={() => navigate('/orders/new')}>
            Pedido telefónico
          </Button>
        }
      />

      <Card>
        <OrderStatusTabs value={status} counts={counts} total={totalAll} onChange={handleStatus} />

        <div {...tabPanelProps(ORDER_TABS_ID, status || 'all')}>
          <div className="border-b border-outline p-4">
            <OrdersFilters values={toolbar} onChange={handleToolbar} />
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <p className="text-sm text-muted" aria-live="polite">
              {data ? (
                <>
                  <b className="font-semibold text-ink">{data.total}</b> {data.total === 1 ? 'pedido' : 'pedidos'}
                </>
              ) : (
                <span>Cargando pedidos…</span>
              )}
            </p>
            <FilterChips items={chips} onRemove={removeChip} onClearAll={() => handleToolbar(EMPTY_TOOLBAR_FILTERS)} />
          </div>

          <OrdersTable
            rows={data?.orders ?? []}
            total={data?.total ?? 0}
            loading={isFetching}
            pagination={pagination}
            onPaginationChange={setPagination}
            onView={(order) => navigate(`/orders/${order.order_id}`)}
            onAssign={(order) => setModal({ kind: 'assign', order })}
            onCancel={(order) => setModal({ kind: 'cancel', order })}
          />
        </div>
      </Card>

      <AssignDriverModal
        open={modal.kind === 'assign'}
        onClose={closeModal}
        onConfirm={handleAssign}
        assigning={assignDelivery.isPending}
        distributorId={modal.kind === 'assign' ? modal.order.distributor_id : undefined}
      />
      <CancelOrderModal
        open={modal.kind === 'cancel'}
        onClose={closeModal}
        onConfirm={handleCancel}
        cancelling={cancelOrderMutation.isPending}
      />
    </div>
  );
};
