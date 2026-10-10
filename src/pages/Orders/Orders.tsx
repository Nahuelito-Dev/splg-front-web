import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { CirclePlus, CircleX, UserRoundCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AnalyticSummary,
  Button,
  Card,
  FilterChips,
  PageHeader,
  SelectionBar,
  tabPanelProps,
  type AnalyticItem,
  type FilterChip,
} from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import type { Order } from '../../services/api/types';
import {
  useAssignOrderDelivery,
  useBulkAssignOrders,
  useBulkCancelOrders,
  useCancelOrder,
  useOrderStatusCounts,
  useOrders,
} from '../../services/queries/orders';
import type { BatchResult } from '../../utils/batch';
import { formatShortId } from '../../utils/format';
import { labelOf, ORDER_FLOW, ORDER_STATUS } from '../../utils/statusLabels';
import { notify } from '../../utils/notifications';
import { AssignDriverModal } from './components/AssignDriverModal';
import { CancelOrderModal } from './components/CancelOrderModal';
import { EditOrderModal } from './components/EditOrderModal';
import { EMPTY_TOOLBAR_FILTERS, isInvertedRange, type OrdersToolbarFilters } from './components/ordersFilterValues';
import { ORDER_TABS_ID, OrderStatusTabs } from './components/OrderStatusTabs';
import { canAssignDriver } from './components/orderStatus';
import { OrdersFilters } from './components/OrdersFilters';
import { OrdersTable } from './components/OrdersTable';

// Ver el detalle de un pedido navega a su ficha (`/orders/:id`); acá sólo
// quedan las acciones rápidas de la tabla (asignar y cancelar).
type ModalState =
  | { kind: 'closed' }
  | { kind: 'assign'; order: Order }
  | { kind: 'cancel'; order: Order }
  | { kind: 'edit'; order: Order }
  | { kind: 'bulk-assign' }
  | { kind: 'bulk-cancel' };

export const Orders = () => {
  const navigate = useNavigate();
  const { canWrite } = usePermissions();
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
  const bulkAssign = useBulkAssignOrders();
  const bulkCancel = useBulkCancelOrders();
  // La selección es sólo de lo que se ve: cambiar de pestaña, filtro, búsqueda o página la suelta.
  const [selected, setSelected] = useState<Record<string, Order>>({});
  const clearSelection = () => setSelected({});
  const visibleIds = new Set((data?.orders ?? []).map((order) => order.order_id));
  const selectedOrders = Object.values(selected).filter((order) => visibleIds.has(order.order_id));
  const assignable = selectedOrders.filter((order) => canAssignDriver(order.status));
  const label = (order: Order) => `${formatShortId(order.order_id)} · ${order.customer?.full_name ?? 'Sin nombre'}`;
  const bulkBusy = bulkAssign.isPending || bulkCancel.isPending;

  const handleSelection = (ids: string[]) =>
    setSelected((previous) => {
      const known = {
        ...previous,
        ...Object.fromEntries((data?.orders ?? []).map((order) => [order.order_id, order])),
      };
      return Object.fromEntries(ids.flatMap((id) => (known[id] ? [[id, known[id]]] : [])));
    });

  /** Deja marcados sólo los que fallaron o no se llegaron a procesar, para reintentar sin volver a buscarlos. */
  const keepPending = (result: BatchResult) =>
    setSelected((previous) =>
      Object.fromEntries(
        [...result.failed.map((f) => f.id), ...result.notRun].flatMap((id) =>
          previous[id] ? [[id, previous[id]]] : [],
        ),
      ),
    );

  const startBulkAssign = () => {
    const distributors = new Set(assignable.map((order) => order.distributor_id));
    if (assignable.length === 0) {
      notify.error(new Error('Ninguno de los pedidos marcados admite asignar chofer'));
    } else if (distributors.size > 1) {
      notify.error(
        new Error('Los pedidos asignables son de más de una distribuidora: marcá los de una sola para asignar chofer'),
      );
    } else setModal({ kind: 'bulk-assign' });
  };

  const handleBulkAssign = (deliveryId: string) => {
    closeModal();
    bulkAssign.mutate({ ids: assignable.map((order) => order.order_id), deliveryId }, { onSuccess: keepPending });
  };

  const handleBulkCancel = (reason: string) => {
    closeModal();
    bulkCancel.mutate(
      { ids: selectedOrders.map((order) => order.order_id), body: { reason: reason || undefined } },
      { onSuccess: keepPending },
    );
  };

  const bulkDistributorId = assignable[0]?.distributor_id;

  const summary: AnalyticItem[] = ORDER_FLOW.map((flowStatus) => ({
    key: flowStatus,
    label: labelOf(ORDER_STATUS, flowStatus).text,
    count: counts[flowStatus],
    tone: labelOf(ORDER_STATUS, flowStatus).tone,
  }));

  const handleStatus = (value: Order['status'] | '') => {
    clearSelection();
    setStatus(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const handleToolbar = (values: OrdersToolbarFilters) => {
    clearSelection();
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

      <AnalyticSummary
        label="Pedidos por estado"
        items={summary}
        selected={status || undefined}
        onSelect={(key) => handleStatus(key === status ? '' : (key as Order['status']))}
      />

      <Card>
        <OrderStatusTabs value={status} counts={counts} total={totalAll} onChange={handleStatus} />

        <div {...tabPanelProps(ORDER_TABS_ID, status || 'all')}>
          <div className="border-b border-outline p-4">
            <OrdersFilters values={toolbar} onChange={handleToolbar} />
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            {chips.length === 0 && (
              <p className="text-sm text-muted" aria-live="polite">
                {data ? (
                  <>
                    <b className="font-semibold text-ink">{data.total}</b> {data.total === 1 ? 'pedido' : 'pedidos'}
                  </>
                ) : (
                  <span>Cargando pedidos…</span>
                )}
              </p>
            )}
            <FilterChips
              items={chips}
              onRemove={removeChip}
              onClearAll={() => handleToolbar(EMPTY_TOOLBAR_FILTERS)}
              resultCount={data?.total}
            />
          </div>

          <SelectionBar
            count={selectedOrders.length}
            noun={['pedido', 'pedidos']}
            onClear={clearSelection}
            busy={bulkBusy}
            onStop={bulkAssign.isPending ? bulkAssign.stop : bulkCancel.stop}
          >
            <Button size="sm" variant="secondary" icon={<UserRoundCog />} disabled={bulkBusy} onClick={startBulkAssign}>
              Asignar chofer
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<CircleX />}
              disabled={bulkBusy}
              onClick={() => setModal({ kind: 'bulk-cancel' })}
            >
              Cancelar pedidos
            </Button>
          </SelectionBar>

          <OrdersTable
            rows={data?.orders ?? []}
            total={data?.total ?? 0}
            loading={isFetching}
            pagination={pagination}
            onPaginationChange={(model) => {
              clearSelection();
              setPagination(model);
            }}
            onView={(order) => navigate(`/orders/${order.order_id}`)}
            onAssign={(order) => setModal({ kind: 'assign', order })}
            onEdit={canWrite ? (order) => setModal({ kind: 'edit', order }) : undefined}
            onCancel={(order) => setModal({ kind: 'cancel', order })}
            filtered={chips.length > 0 || status !== ''}
            selection={{ ids: Object.keys(selected), onChange: handleSelection }}
          />
        </div>
      </Card>

      <AssignDriverModal
        open={modal.kind === 'assign' || modal.kind === 'bulk-assign'}
        onClose={closeModal}
        onConfirm={modal.kind === 'bulk-assign' ? handleBulkAssign : handleAssign}
        assigning={assignDelivery.isPending}
        distributorId={
          modal.kind === 'assign'
            ? modal.order.distributor_id
            : modal.kind === 'bulk-assign'
              ? bulkDistributorId
              : undefined
        }
        count={modal.kind === 'bulk-assign' ? assignable.length : 1}
        affected={modal.kind === 'bulk-assign' ? assignable.map(label) : undefined}
      />
      <EditOrderModal order={modal.kind === 'edit' ? modal.order : null} onClose={closeModal} />
      <CancelOrderModal
        open={modal.kind === 'cancel' || modal.kind === 'bulk-cancel'}
        onClose={closeModal}
        onConfirm={modal.kind === 'bulk-cancel' ? handleBulkCancel : handleCancel}
        cancelling={cancelOrderMutation.isPending}
        count={modal.kind === 'bulk-cancel' ? selectedOrders.length : 1}
        affected={modal.kind === 'bulk-cancel' ? selectedOrders.map(label) : undefined}
      />
    </div>
  );
};
