import type { GridPaginationModel } from '@mui/x-data-grid';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Card,
  DateRangeFilter,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageContainer,
  PageHeader,
  Select,
  TableToolbar,
  type FilterChip,
} from '../../common/components/ui';
import { useSocketContext } from '../../context/useSocketContext';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import { ORDER_SOCKET_EVENTS } from '../../hooks/useSocket';
import type { FailedVisitStatusFilter } from '../../services/api/failedVisits';
import type { FailedVisit, FailedVisitOrder } from '../../services/api/types';
import { useFailedVisitOrders } from '../../services/queries/failedVisits';
import { useAssignOrderDelivery, useCancelOrder } from '../../services/queries/orders';
import { queryKeys } from '../../services/queries/queryKeys';
import { formatDay, formatShortId } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { FAILED_VISIT_REASON, labelOf } from '../../utils/statusLabels';
import { AssignDriverModal } from '../Orders/components/AssignDriverModal';
import { CancelOrderModal } from '../Orders/components/CancelOrderModal';
import { FailedVisitDrawer } from './components/FailedVisitDrawer';
import { FailedVisitsTable } from './components/FailedVisitsTable';
import { ScheduleRevisitModal } from './components/ScheduleRevisitModal';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: FailedVisitStatusFilter; label: string }[] = [
  { value: 'open', label: 'Pendientes' },
  { value: 'awaiting_admin', label: 'Decidís vos' },
  { value: 'proposed', label: 'Propuestas al cliente' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'all', label: 'Todas (también cerradas)' },
];

const REASONS: FailedVisit['reason'][] = ['customer_absent', 'address_closed', 'rejected', 'other'];
const REASON_OPTIONS = [
  { value: 'all', label: 'Todos los motivos' },
  ...REASONS.map((reason) => ({ value: reason, label: labelOf(FAILED_VISIT_REASON, reason).text })),
];

/** Los eventos del panel que cambian esta lista: una visita fallida nueva o una nueva visita que se movió. */
const SOCKET_EVENTS = [
  ORDER_SOCKET_EVENTS.FAILED_VISIT,
  ORDER_SOCKET_EVENTS.REVISIT_UPDATED,
  ORDER_SOCKET_EVENTS.CANCELLED,
  ORDER_SOCKET_EVENTS.ACCEPTED,
];

type Action = { kind: 'schedule' | 'assign' | 'cancel'; order: FailedVisitOrder } | null;

/**
 * Pedidos que no se pudieron entregar y su nueva visita (C5): qué pasó en cada visita, qué se le propuso al cliente y,
 * cuando el sistema deja de reprogramar, la decisión del admin (fijar día y franja, reasignar o cancelar).
 */
export const FailedVisits = () => {
  const { needsDistributor } = usePermissions();
  const queryClient = useQueryClient();
  const { subscribe } = useSocketContext();
  const [{ status: statusParam, reason: reasonParam, from, to, q, page, order: orderParam }, setFilters] = useUrlParams(
    { status: 'open', reason: 'all', from: '', to: '', q: '', page: '1', order: '' },
  );
  const status = STATUS_OPTIONS.find((o) => o.value === statusParam)?.value ?? 'open';
  const reason = REASONS.find((r) => r === reasonParam);
  const term = useDebounce(q.trim());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(page) - 1 || 0), pageSize: PAGE_SIZE };
  const [action, setAction] = useState<Action>(null);

  const { data, isLoading, isFetching, error, refetch } = useFailedVisitOrders(
    {
      status,
      reason,
      from: from || undefined,
      to: to || undefined,
      term: term || undefined,
      limit: PAGE_SIZE,
      offset: pagination.page * PAGE_SIZE,
    },
    !needsDistributor,
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  // El pedido abierto vive en la URL (`?order=<id>`): el aviso de la bandeja puede llevar directo a él.
  const selected = rows.find((row) => row.orderId === orderParam) ?? null;

  const assignDelivery = useAssignOrderDelivery();
  const cancelOrder = useCancelOrder();

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.failedVisits.all });
    const unsubscribers = SOCKET_EVENTS.map((event) => subscribe(event, refresh));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [subscribe, queryClient]);

  const closeAction = () => setAction(null);
  const done = (message: string) => {
    notify.success(message);
    closeAction();
    setFilters({ order: '' });
    void queryClient.invalidateQueries({ queryKey: queryKeys.failedVisits.all });
  };

  const chips: FilterChip[] = [];
  if (status !== 'open')
    chips.push({ key: 'status', label: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status });
  if (reason) chips.push({ key: 'reason', name: 'Motivo', label: labelOf(FAILED_VISIT_REASON, reason).text });
  if (from || to)
    chips.push({
      key: 'dates',
      name: 'Fechas',
      label: `${from ? formatDay(from) : '…'} a ${to ? formatDay(to) : '…'}`,
    });
  if (q.trim()) chips.push({ key: 'q', label: `"${q.trim()}"` });
  const removeChip = (key: string) => {
    if (key === 'status') setFilters({ status: 'open', page: '1' });
    else if (key === 'reason') setFilters({ reason: 'all', page: '1' });
    else if (key === 'dates') setFilters({ from: '', to: '', page: '1' });
    else setFilters({ q: '', page: '1' });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Visitas fallidas"
        description="Pedidos que no se pudieron entregar y cuándo se vuelve a pasar. A la segunda visita fallida decidís vos."
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus visitas fallidas."
          />
        </Card>
      ) : isLoading ? (
        <Card>
          <ListSkeleton />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} resource="Las visitas fallidas" onRetry={() => void refetch()} />
        </Card>
      ) : (
        <Card>
          <TableToolbar
            filters={
              <>
                <Select
                  label="Estado"
                  className="sm:w-56"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(e) => setFilters({ status: e.target.value, page: '1' })}
                />
                <Select
                  label="Motivo"
                  className="sm:w-56"
                  value={reason ?? 'all'}
                  options={REASON_OPTIONS}
                  onChange={(e) => setFilters({ reason: e.target.value, page: '1' })}
                />
                <DateRangeFilter
                  label="Última visita"
                  from={from}
                  to={to}
                  onChange={(range) => setFilters({ ...range, page: '1' })}
                />
              </>
            }
            search={{
              label: 'Buscar visitas fallidas',
              placeholder: 'Cliente o n.º de pedido',
              value: q,
              onChange: (value) => setFilters({ q: value, page: '1' }),
            }}
            chips={chips}
            onRemoveChip={removeChip}
            onClearChips={() => setFilters({ status: 'open', reason: 'all', from: '', to: '', q: '', page: '1' })}
            resultCount={total}
            noun={['pedido', 'pedidos']}
          />
          <FailedVisitsTable
            rows={rows}
            total={total}
            loading={isFetching}
            pagination={pagination}
            onPaginationChange={(model) => setFilters({ page: String(model.page + 1) })}
            filtered={chips.length > 0}
            onView={(row) => setFilters({ order: row.orderId })}
          />
        </Card>
      )}

      <FailedVisitDrawer
        order={selected}
        onClose={() => setFilters({ order: '' })}
        onSchedule={(order) => setAction({ kind: 'schedule', order })}
        onAssign={(order) => setAction({ kind: 'assign', order })}
        onCancel={(order) => setAction({ kind: 'cancel', order })}
      />
      <ScheduleRevisitModal
        orderId={action?.kind === 'schedule' ? action.order.orderId : null}
        onClose={closeAction}
        onDone={() => setFilters({ order: '' })}
      />
      <AssignDriverModal
        open={action?.kind === 'assign'}
        onClose={closeAction}
        assigning={assignDelivery.isPending}
        error={assignDelivery.error}
        onConfirm={(deliveryId) => {
          if (action?.kind !== 'assign') return;
          assignDelivery.mutate(
            { id: action.order.orderId, deliveryId },
            { onSuccess: () => done(`Pedido ${formatShortId(action.order.orderId)} reasignado`) },
          );
        }}
      />
      <CancelOrderModal
        open={action?.kind === 'cancel'}
        onClose={closeAction}
        cancelling={cancelOrder.isPending}
        onConfirm={(cancelReason) => {
          if (action?.kind !== 'cancel') return;
          cancelOrder.mutate(
            { id: action.order.orderId, body: { reason: cancelReason || undefined } },
            {
              onSuccess: () => done(`Pedido ${formatShortId(action.order.orderId)} cancelado`),
              onError: notify.error,
            },
          );
        }}
      />
    </PageContainer>
  );
};
