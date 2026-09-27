import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { Card, PageHeader } from '../../common/components/ui';
import { useDebounce } from '../../hooks';
import type { Order } from '../../services/api/types';
import { useAssignOrderDelivery, useCancelOrder, useOrders } from '../../services/queries/orders';
import { notify } from '../../utils/notifications';
import { AssignDriverModal } from './components/AssignDriverModal';
import { CancelOrderModal } from './components/CancelOrderModal';
import { OrdersFilters } from './components/OrdersFilters';
import { EMPTY_FILTERS, type OrdersFilterValues } from './components/ordersFilterValues';
import { OrdersTable } from './components/OrdersTable';

// Ver el detalle de un pedido navega a su ficha (`/orders/:id`); acá sólo
// quedan las acciones rápidas de la tabla (asignar y cancelar).
type ModalState = { kind: 'closed' } | { kind: 'assign'; order: Order } | { kind: 'cancel'; order: Order };

export const Orders = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<OrdersFilterValues>(EMPTY_FILTERS);
  const debouncedSearch = useDebounce(filters.search.trim());
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });

  const { data, isFetching } = useOrders(pagination, {
    search: debouncedSearch,
    status: filters.status || undefined,
    from: filters.from,
    to: filters.to,
  });
  const assignDelivery = useAssignOrderDelivery();
  const cancelOrderMutation = useCancelOrder();

  const handleFilters = (values: OrdersFilterValues) => {
    setFilters(values);
    setPagination((p) => ({ ...p, page: 0 }));
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
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-outline p-4 xl:flex-row xl:items-end xl:justify-between">
          <OrdersFilters values={filters} onChange={handleFilters} />
          <p className="shrink-0 text-sm text-muted xl:pb-2.5" aria-live="polite">
            {data ? `${data.total} ${data.total === 1 ? 'pedido' : 'pedidos'}` : ''}
          </p>
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
      </Card>

      <AssignDriverModal
        open={modal.kind === 'assign'}
        onClose={closeModal}
        onConfirm={handleAssign}
        assigning={assignDelivery.isPending}
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
