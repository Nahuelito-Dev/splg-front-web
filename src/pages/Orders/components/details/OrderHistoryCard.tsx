import { Card, CardHeader, FichaTimeline } from '../../../../common/components/ui';
import { errorMessage, toApiError } from '../../../../services/api/errors';
import { useOrderStatusHistory } from '../../../../services/queries/orders';
import { buildOrderHistory } from './orderHistory';

/** Historial vertical del pedido: cada cambio de estado y cada anotación con fecha, quién y motivo. */
export const OrderHistoryCard = ({ orderId }: { orderId: string }) => {
  const { data: entries, isPending, isError, error, refetch } = useOrderStatusHistory(orderId);

  return (
    <Card className="p-5">
      <CardHeader title="Historial" />
      {isPending ? (
        <p className="text-sm text-muted">Cargando el historial…</p>
      ) : isError && toApiError(error).missingDistributor ? (
        <p role="status" className="text-sm text-muted">
          El historial es de una empresa: lo ve su administrador
        </p>
      ) : isError ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo cargar el historial del pedido: {errorMessage(error)}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">Este pedido no tiene historial registrado.</p>
      ) : (
        <FichaTimeline items={buildOrderHistory(entries)} />
      )}
    </Card>
  );
};
