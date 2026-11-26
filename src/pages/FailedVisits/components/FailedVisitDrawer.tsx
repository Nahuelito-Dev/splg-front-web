import { Link } from 'react-router-dom';
import { Badge, Button, DetailList, Drawer, ListSkeleton } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { errorMessage } from '../../../services/api/errors';
import type { FailedVisitOrder } from '../../../services/api/types';
import { useOrderFailedVisits } from '../../../services/queries/failedVisits';
import { formatCurrency, formatShortId } from '../../../utils/format';
import { PAYMENT_METHOD, PAYMENT_STATUS, labelOf } from '../../../utils/statusLabels';
import { canScheduleRevisit, isClosedOrder, orderRevisitWhen, revisitBadge } from '../revisit';
import { FailedVisitHistory } from './FailedVisitHistory';

interface Props {
  order: FailedVisitOrder | null;
  onClose: () => void;
  onSchedule: (order: FailedVisitOrder) => void;
  onAssign: (order: FailedVisitOrder) => void;
  onCancel: (order: FailedVisitOrder) => void;
}

/** El pedido con sus visitas fallidas y lo que el admin puede hacer: fijar día y franja, reasignar o cancelar. */
export const FailedVisitDrawer = ({ order, onClose, onSchedule, onAssign, onCancel }: Props) => {
  const { canOperate, operateHint } = usePermissions();
  const history = useOrderFailedVisits(order?.orderId);
  if (!order) return null;
  const open = canScheduleRevisit(order);
  const when = orderRevisitWhen(order);
  const badge = revisitBadge(order);

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Pedido ${formatShortId(order.orderId)}`}
      description={`${order.failedVisitCount} ${order.failedVisitCount === 1 ? 'visita fallida' : 'visitas fallidas'}`}
      size="lg"
      footer={
        open ? (
          <>
            {operateHint && <p className="mr-auto self-center text-sm text-muted">{operateHint}</p>}
            <Button variant="danger" onClick={() => onCancel(order)} disabled={!canOperate}>
              Cancelar pedido
            </Button>
            <Button variant="secondary" onClick={() => onAssign(order)} disabled={!canOperate}>
              Reasignar
            </Button>
            <Button onClick={() => onSchedule(order)} disabled={!canOperate}>
              Fijar día y franja
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {order.revisitStatus === 'awaiting_admin' && open && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger">
            El sistema dejó de reprogramar este pedido: fijale día y franja, reasignalo a un chofer o cancelalo. No
            vuelve solo al despacho.
          </p>
        )}
        <DetailList
          items={[
            { label: 'Cliente', value: order.customerName ?? '—' },
            { label: 'Teléfono', value: order.customerPhone ?? '—' },
            { label: 'Domicilio', value: order.address ?? '—' },
            { label: 'Último chofer', value: order.driverName ?? '—' },
            {
              label: 'Nueva visita',
              value: badge ? (
                <span className="flex flex-wrap items-center gap-2">
                  <Badge label={badge} />
                  {!isClosedOrder(order) && (when ?? 'Sin fecha')}
                </span>
              ) : (
                '—'
              ),
            },
            {
              label: 'Pago',
              value: `${formatCurrency(order.total)} · ${labelOf(PAYMENT_METHOD, order.paymentMethod).text} · ${labelOf(PAYMENT_STATUS, order.paymentStatus).text}`,
            },
          ]}
        />
        <section aria-label="Historial de visitas">
          <h3 className="mb-3 text-sm font-semibold text-ink">Historial de visitas</h3>
          {history.isLoading ? (
            <ListSkeleton />
          ) : history.isError ? (
            <p role="alert" className="text-sm text-danger">
              No se pudo cargar el historial: {errorMessage(history.error)}{' '}
              <button type="button" className="font-semibold underline" onClick={() => void history.refetch()}>
                Reintentar
              </button>
            </p>
          ) : (
            <FailedVisitHistory visits={history.data ?? []} />
          )}
        </section>
        <Link to={`/orders/${order.orderId}`} className="inline-block text-sm font-semibold text-primary underline">
          Ver el pedido completo
        </Link>
      </div>
    </Drawer>
  );
};
