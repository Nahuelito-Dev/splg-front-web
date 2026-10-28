import { useEffect, useMemo, useState } from 'react';
import { List, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, PageHeader, SearchInput, PageContainer } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { Order } from '../../services/api/types';
import { useAssignOrderDelivery, useDispatchBoard } from '../../services/queries/orders';
import { notify } from '../../utils/notifications';
import { AssignDriverModal } from './components/AssignDriverModal';
import { DispatchColumn } from './components/DispatchColumn';
import { OrderQuickDrawer } from './components/OrderQuickDrawer';
import { BOARD_STATUSES, matchesBoardSearch, sortColumn, truncationNote } from './boardRules';
import { useDispatchBoardSync } from './useDispatchBoardSync';

/** Cada cuánto se recalculan los «hace Xm» de las tarjetas. */
const CLOCK_MS = 30_000;

/**
 * Tablero de despacho: una columna por etapa del pedido (pendiente, aceptado, en camino y entregado hoy). Se refresca
 * solo con los eventos del socket. Las etapas las mueve el sistema (el chofer acepta, sale y entrega): desde acá sólo
 * se asigna o reasigna el chofer y se abre el pedido; no hay arrastre porque la API no deja saltear la máquina de estados.
 */
export const DispatchBoard = () => {
  const navigate = useNavigate();
  const { canOperate, operateHint } = usePermissions();
  const { isOnline, refetchInterval } = useDispatchBoardSync();
  const board = useDispatchBoard({ refetchInterval });
  const assignDelivery = useAssignOrderDelivery();
  const [search, setSearch] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Order | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(timer);
  }, []);

  const { pending, accepted, out_for_delivery: onTheWay, delivered } = board;
  const columns = useMemo(() => {
    const byStatus = { pending, accepted, out_for_delivery: onTheWay, delivered };
    return BOARD_STATUSES.map((status) => {
      const fetched = byStatus[status].data?.orders ?? [];
      return {
        status,
        orders: sortColumn(
          status,
          fetched.filter((order) => matchesBoardSearch(order, search)),
        ),
        note: truncationNote(status, fetched, byStatus[status].data?.total ?? null),
      };
    });
  }, [pending, accepted, onTheWay, delivered, search]);

  // El panel muestra siempre la versión más nueva del pedido que está en el tablero, no la que había al abrirlo.
  const previewing = useMemo(
    () =>
      previewingId === null
        ? null
        : (BOARD_STATUSES.flatMap((status) => board[status].data?.orders ?? []).find(
            (order) => order.order_id === previewingId,
          ) ?? null),
    [board, previewingId],
  );

  const refreshing = BOARD_STATUSES.some((status) => board[status].isFetching);
  const refetchAll = () => BOARD_STATUSES.forEach((status) => void board[status].refetch());

  const handleAssign = (deliveryId: string) => {
    if (!assigning) return;
    assignDelivery.mutate(
      { id: assigning.order_id, deliveryId },
      {
        onSuccess: () => {
          notify.success('Pedido asignado');
          setAssigning(null);
        },
        onError: notify.error,
      },
    );
  };

  return (
    <PageContainer size="xl">
      <PageHeader
        title="Tablero de despacho"
        description="Los pedidos del día por etapa. Se actualiza solo; desde cada tarjeta se asigna el chofer o se abre el pedido."
        badges={
          <Badge
            label={
              isOnline
                ? { text: 'En vivo', tone: 'success' }
                : { text: 'Sin conexión en vivo · actualiza cada 20 s', tone: 'warn' }
            }
          />
        }
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw />} loading={refreshing} onClick={refetchAll}>
              Actualizar
            </Button>
            <Button variant="secondary" icon={<List />} onClick={() => navigate('/orders')}>
              Ver como lista
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <SearchInput
          label="Buscar en el tablero"
          placeholder="Cliente, chofer, calle o #pedido"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="flex items-start gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {columns.map(({ status, orders, note }) => (
          <DispatchColumn
            key={status}
            status={status}
            orders={orders}
            note={note}
            hasData={board[status].data !== undefined}
            loading={board[status].isPending}
            error={board[status].error}
            onRetry={() => void board[status].refetch()}
            filtered={search.trim() !== ''}
            now={now}
            onAssign={canOperate ? setAssigning : undefined}
            onPreview={(order) => setPreviewingId(order.order_id)}
            onOpen={(order) => navigate(`/orders/${order.order_id}`)}
          />
        ))}
      </div>
      {!canOperate && <p className="mt-3 text-sm text-muted">{operateHint}</p>}

      <OrderQuickDrawer
        open={previewing !== null}
        onClose={() => setPreviewingId(null)}
        order={previewing}
        onAssign={
          canOperate
            ? (order) => {
                setPreviewingId(null);
                setAssigning(order);
              }
            : undefined
        }
      />
      <AssignDriverModal
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        onConfirm={handleAssign}
        assigning={assignDelivery.isPending}
        error={assignDelivery.error}
        distributorId={assigning?.distributor_id}
      />
    </PageContainer>
  );
};
