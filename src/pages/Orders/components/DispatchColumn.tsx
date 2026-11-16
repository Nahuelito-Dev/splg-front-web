import { Badge, Button, ErrorState, Skeleton } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { labelOf, ORDER_STATUS } from '../../../utils/statusLabels';
import { COLUMN_EMPTY, COLUMN_TITLE, type BoardStatus } from '../boardRules';
import { DispatchCard } from './DispatchCard';

interface Props {
  status: BoardStatus;
  orders: Order[];
  /** Aviso de columna incompleta (ver `truncationNote`); null si está completa. */
  note: string | null;
  loading: boolean;
  error: unknown;
  /** Hay datos de una consulta anterior (puede ser el caso de un error al refrescar). */
  hasData: boolean;
  onRetry: () => void;
  /** Hay un filtro de texto activo: un vacío significa «sin resultados». */
  filtered: boolean;
  now: number;
  onAssign?: (order: Order) => void;
  onPreview: (order: Order) => void;
  onOpen: (order: Order) => void;
}

/** Una columna del tablero: el estado, cuántos hay y sus tarjetas. */
export const DispatchColumn = ({
  status,
  orders,
  note,
  loading,
  error,
  hasData,
  onRetry,
  filtered,
  now,
  onAssign,
  onPreview,
  onOpen,
}: Props) => {
  return (
    <section
      aria-label={`Columna ${COLUMN_TITLE[status]}`}
      className="flex w-[280px] shrink-0 flex-col rounded-xl border border-outline bg-surface-sunken p-2.5 lg:w-auto lg:min-w-0"
    >
      <header className="mb-2.5 flex items-center justify-between gap-2 px-1">
        <Badge label={{ ...labelOf(ORDER_STATUS, status), text: COLUMN_TITLE[status] }} />
        <span className="font-mono text-xs text-muted" aria-label={`${orders.length} pedidos`}>
          {loading ? '–' : orders.length}
        </span>
      </header>
      {note && <p className="mb-2 rounded-lg bg-warn-soft px-2.5 py-1.5 text-[11.5px] text-warn">{note}</p>}
      {Boolean(error) && hasData && (
        <div role="alert" className="mb-2 rounded-lg bg-danger-soft px-2.5 py-1.5 text-[11.5px] text-danger">
          No se pudo actualizar: se muestran los últimos datos que llegaron.{' '}
          <Button size="sm" variant="ghost" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
      {loading ? (
        <div role="status" aria-label={`Cargando ${COLUMN_TITLE[status].toLowerCase()}`} className="space-y-2">
          {[0, 1, 2].map((slot) => (
            <Skeleton key={slot} className="h-28 w-full" />
          ))}
        </div>
      ) : error && !hasData ? (
        <ErrorState error={error} resource="Los pedidos" onRetry={onRetry} />
      ) : orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline px-3 py-6 text-center text-[12px] text-muted">
          {filtered ? 'Sin resultados' : COLUMN_EMPTY[status]}
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <DispatchCard
              key={order.order_id}
              order={order}
              now={now}
              onAssign={onAssign}
              onPreview={onPreview}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
