import { CircleX, UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, ErrorState, IconButton, SearchInput, TableSkeleton } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { AssignDriverModal } from '../../Orders/components/AssignDriverModal';
import { CancelOrderModal } from '../../Orders/components/CancelOrderModal';
import type { Order } from '../../../services/api/types';
import { useAssignOrderDelivery, useCancelOrder } from '../../../services/queries/orders';
import { formatCurrency, formatDateTime, formatShortId } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { POOL_PAGE_SIZE, type AvailablePool } from '../useAvailablePool';

type ModalState = { kind: 'closed' } | { kind: 'assign'; order: Order } | { kind: 'cancel'; order: Order };

/**
 * CU-080: los pedidos `pending` sin chofer asignado, acotados a la
 * distribuidora activa. Es el mismo pool que ve la app del chofer; acá el
 * admin puede asignar a mano al que no lo tomó nadie, o cancelarlo.
 */
export const AvailableOrdersPool = ({ pool }: { pool: AvailablePool }) => {
  const navigate = useNavigate();
  // Sin distribuidora elegida (administrador general) la API rechaza con 400 asignar y cancelar.
  const { canOperate, operateHint } = usePermissions();
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const { search, setSearch, page, setPage, orders, total, isLoading, isError, error, refetch } = pool;
  const assignDelivery = useAssignOrderDelivery();
  const cancelOrderMutation = useCancelOrder();

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

  const lastPage = Math.max(0, Math.ceil(total / POOL_PAGE_SIZE) - 1);
  const searching = search.trim() !== '';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-outline p-3">
        <SearchInput
          label="Buscar en el pool"
          placeholder="Cliente o id del pedido"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-full"
        />
      </div>
      {isLoading ? (
        <TableSkeleton rows={5} columns={1} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : orders.length === 0 ? (
        searching ? (
          <EmptyState
            title="Sin resultados"
            description={`Ningún pedido disponible coincide con «${search.trim()}».`}
          />
        ) : (
          <EmptyState title="No hay pedidos disponibles" description="Pendientes sin chofer: todavía nadie los tomó." />
        )
      ) : (
        <>
          <ul className="min-h-0 flex-1 divide-y divide-outline overflow-y-auto" aria-label="Pedidos disponibles">
            {orders.map((order) => (
              <li key={order.order_id} className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => navigate(`/orders/${order.order_id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {order.customer?.full_name ?? 'Cliente sin nombre'}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-ink">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {order.delivery_address?.street ?? 'Sin dirección'}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {formatShortId(order.order_id)} · {formatDateTime(order.created_at)}
                  </span>
                </button>
                <IconButton
                  label={
                    canOperate
                      ? `Asignar chofer al pedido ${formatShortId(order.order_id)}`
                      : `Asignar chofer al pedido ${formatShortId(order.order_id)} (no disponible: ${operateHint})`
                  }
                  icon={<UserRoundCog />}
                  {...(canOperate ? {} : { 'aria-disabled': true, className: 'cursor-not-allowed opacity-50' })}
                  onClick={canOperate ? () => setModal({ kind: 'assign', order }) : undefined}
                />
                <IconButton
                  label={
                    canOperate
                      ? `Cancelar pedido ${formatShortId(order.order_id)}`
                      : `Cancelar pedido ${formatShortId(order.order_id)} (no disponible: ${operateHint})`
                  }
                  icon={<CircleX />}
                  tone="danger"
                  {...(canOperate ? {} : { 'aria-disabled': true, className: 'cursor-not-allowed opacity-50' })}
                  onClick={canOperate ? () => setModal({ kind: 'cancel', order }) : undefined}
                />
              </li>
            ))}
          </ul>
          {total > POOL_PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2 border-t border-outline px-4 py-2 text-xs text-muted">
              <span>
                Página {page + 1} de {lastPage + 1} · {total} pedidos
              </span>
              <span className="flex gap-1">
                <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button variant="secondary" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>
                  Siguiente
                </Button>
              </span>
            </div>
          )}
        </>
      )}

      <AssignDriverModal
        open={modal.kind === 'assign'}
        onClose={closeModal}
        onConfirm={handleAssign}
        assigning={assignDelivery.isPending}
        error={assignDelivery.error}
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
