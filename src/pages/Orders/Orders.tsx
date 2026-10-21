import { useEffect, useState } from 'react';
import { CirclePlus, CircleX, UserRoundCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AnalyticSummary,
  Button,
  Card,
  PageHeader,
  SelectionBar,
  TableToolbar,
  tabPanelProps,
  type AnalyticItem,
  type FilterChip,
  PageContainer,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlPagedParams } from '../../hooks';
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
import { formatDay, formatShortId } from '../../utils/format';
import {
  labelOf,
  ORDER_FLOW,
  ORDER_STATUS,
  PAYMENT_STATUS_ORDER,
  paymentFilterLabel,
  paymentStatusLabel,
} from '../../utils/statusLabels';
import { notify } from '../../utils/notifications';
import { AssignDriverModal } from './components/AssignDriverModal';
import { CancelOrderModal } from './components/CancelOrderModal';
import { EditOrderModal } from './components/EditOrderModal';
import { isInvertedRange, type OrdersToolbarFilters } from './components/ordersFilterValues';
import { ORDER_TABS_ID, OrderStatusTabs } from './components/OrderStatusTabs';
import { canAssignDriver } from './components/orderStatus';
import { OrdersFilters } from './components/OrdersFilters';
import { OrderQuickDrawer } from './components/OrderQuickDrawer';
import { OrdersTable } from './components/OrdersTable';
import { csvDateTime } from '../../utils/csv';

// Ver un pedido abre un panel lateral sin salir del listado (con enlace a su ficha, `/orders/:id`);
// el resto son las acciones rápidas de la tabla (asignar, editar y cancelar).
type ModalState =
  | { kind: 'closed' }
  | { kind: 'assign'; order: Order }
  | { kind: 'cancel'; order: Order }
  | { kind: 'edit'; order: Order }
  | { kind: 'bulk-assign' }
  | { kind: 'bulk-cancel' };

export const Orders = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint, canOperate, operateHint } = usePermissions();
  // Sin distribuidora elegida (administrador general) la API rechaza con 400 toda escritura sobre pedidos.
  const blockedReason = canOperate ? undefined : operateHint;
  // El estado, los filtros y la página viven en la URL: al volver de una ficha el listado queda como estaba.
  const [urlFilters, setUrlFilters, pagination, setPagination] = useUrlPagedParams(
    { status: '', q: '', payment: '', from: '', to: '' },
    10,
  );
  const status = ORDER_FLOW.find((flowStatus) => flowStatus === urlFilters.status) ?? '';
  const toolbar: OrdersToolbarFilters = {
    search: urlFilters.q,
    payment: PAYMENT_STATUS_ORDER.find((payment) => payment === urlFilters.payment) ?? '',
    from: urlFilters.from,
    to: urlFilters.to,
  };
  const debouncedSearch = useDebounce(toolbar.search.trim());
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [viewing, setViewing] = useState<Order | null>(null);

  const invertedRange = isInvertedRange(toolbar);
  // Las pestañas y el resumen cuentan con la misma búsqueda, cobro y fechas que el listado.
  const listFilters = {
    search: debouncedSearch,
    paymentStatus: toolbar.payment || undefined,
    from: invertedRange ? '' : toolbar.from,
    to: invertedRange ? '' : toolbar.to,
  };
  const { counts, total: totalAll } = useOrderStatusCounts(listFilters);
  const { data, isFetching } = useOrders(pagination, { ...listFilters, status: status || undefined });
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
    setUrlFilters({ status: value });
  };

  const handleToolbar = (values: OrdersToolbarFilters) => {
    clearSelection();
    setUrlFilters({ q: values.search, payment: values.payment, from: values.from, to: values.to });
  };

  const chips: FilterChip[] = [];
  if (toolbar.search) chips.push({ key: 'search', label: `"${toolbar.search}"` });
  if (toolbar.payment) chips.push({ key: 'payment', label: `Cobro: ${paymentFilterLabel(toolbar.payment).text}` });
  if (toolbar.from) chips.push({ key: 'from', label: `Desde ${formatDay(toolbar.from)}` });
  if (toolbar.to) chips.push({ key: 'to', label: `Hasta ${formatDay(toolbar.to)}` });

  // El estado vive en las pestañas; sólo se repite como chip cuando hay otros filtros, para sacarlo junto con ellos.
  if (chips.length > 0 && status)
    chips.unshift({ key: 'status', label: `Estado: ${labelOf(ORDER_STATUS, status).text}` });

  const removeChip = (key: string) => {
    if (key === 'status') handleStatus('');
    else if (key === 'search') handleToolbar({ ...toolbar, search: '' });
    else if (key === 'payment') handleToolbar({ ...toolbar, payment: '' });
    else if (key === 'from') handleToolbar({ ...toolbar, from: '' });
    else if (key === 'to') handleToolbar({ ...toolbar, to: '' });
  };

  // Una `?page=` fuera de rango vuelve a la última página que existe.
  useEffect(() => {
    if (data && !isFetching && data.total > 0 && data.orders.length === 0 && pagination.page > 0)
      setPagination({ page: Math.max(0, Math.ceil(data.total / pagination.pageSize) - 1) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isFetching, pagination.page]);

  const exported = selectedOrders.length > 0 ? selectedOrders : (data?.orders ?? []);
  const exportRows = exported.map((order) => [
    formatShortId(order.order_id),
    csvDateTime(order.created_at),
    order.customer?.full_name ?? '',
    order.delivery_address?.street ?? '',
    order.delivery_name ?? '',
    labelOf(ORDER_STATUS, order.status).text,
    order.paymentStatus ? paymentStatusLabel(order.paymentStatus, order.paymentMethodDetail).text : '',
    order.total_amount,
  ]);

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
    <PageContainer>
      <PageHeader
        title="Pedidos"
        description="Pedidos en curso y su historial. La asignación de chofer es automática; acá se puede forzar o cancelar."
        actions={
          <Button
            icon={<CirclePlus />}
            blockedReason={canWrite ? undefined : writeHint}
            onClick={() => navigate('/orders/new')}
          >
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
          <TableToolbar
            filters={<OrdersFilters values={toolbar} onChange={handleToolbar} />}
            search={{
              label: 'Buscar pedidos',
              placeholder: 'Cliente, teléfono o n.º de pedido',
              value: toolbar.search,
              onChange: (value) => handleToolbar({ ...toolbar, search: value }),
            }}
            csv={{
              filename: 'pedidos',
              label: selectedOrders.length > 0 ? 'Exportar selección' : 'Exportar CSV',
              headers: ['Pedido', 'Fecha', 'Cliente', 'Entrega', 'Chofer', 'Estado', 'Cobro', 'Total'],
              rows: exportRows,
            }}
            chips={chips}
            onRemoveChip={removeChip}
            onClearChips={() => {
              clearSelection();
              setUrlFilters({ status: '', q: '', payment: '', from: '', to: '' });
            }}
            resultCount={data?.total}
            noun={['pedido', 'pedidos']}
          />

          <SelectionBar
            count={selectedOrders.length}
            noun={['pedido', 'pedidos']}
            onClear={clearSelection}
            busy={bulkBusy}
            onStop={bulkAssign.isPending ? bulkAssign.stop : bulkCancel.stop}
          >
            <Button
              size="sm"
              variant="secondary"
              icon={<UserRoundCog />}
              disabled={bulkBusy}
              blockedReason={blockedReason}
              onClick={startBulkAssign}
            >
              Asignar chofer
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<CircleX />}
              disabled={bulkBusy}
              blockedReason={blockedReason}
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
            onView={setViewing}
            onAssign={canOperate ? (order) => setModal({ kind: 'assign', order }) : undefined}
            onEdit={canWrite ? (order) => setModal({ kind: 'edit', order }) : undefined}
            onCancel={canOperate ? (order) => setModal({ kind: 'cancel', order }) : undefined}
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
      <OrderQuickDrawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        order={viewing}
        onAssign={
          canOperate
            ? (order) => {
                setViewing(null);
                setModal({ kind: 'assign', order });
              }
            : undefined
        }
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
    </PageContainer>
  );
};
