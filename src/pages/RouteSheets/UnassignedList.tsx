import { Clock } from 'lucide-react';
import { Button, Card, CardHeader } from '../../common/components/ui';
import type { LateOrder, RoutePlanDay, UnassignedOrder } from '../../services/api/types';
import { useLateOrders } from '../../services/queries/routeSheets';
import { formatDateTime } from '../../utils/format';
import { sheetTitle, slotOf } from './routeSheetLabels';
import type { StopTarget } from './StopTargetModal';

interface Props {
  day: RoutePlanDay;
  canWrite: boolean;
  onPlace: (target: StopTarget) => void;
}

const OrderLine = ({ order }: { order: UnassignedOrder }) => (
  <p className="text-ink">
    <b className="font-semibold">{order.customerName ?? 'Cliente'}</b> · {order.address ?? 'Sin dirección'}
    <span className="block text-xs text-muted">
      {slotOf(order)} · {order.units} garrafa(s)
    </span>
  </p>
);

/** «Sin asignar»: los pedidos del día que no están en ninguna hoja, con el motivo si no pueden ir en una; y los tardíos. */
export const UnassignedList = ({ day, canWrite, onPlace }: Props) => {
  const late = useLateOrders(day.plan.date);
  const drafts = day.sheets.filter((s) => s.status === 'draft');
  const lateIds = new Set((late.data ?? []).map((o) => o.orderId));
  const regular = day.unassigned.filter((o) => !lateIds.has(o.orderId));
  const noDrafts = drafts.length === 0 ? 'No hay hojas en borrador: creá una o reabrí una confirmada' : undefined;

  const placeButton = (order: UnassignedOrder | LateOrder, label = 'Agregar a una hoja') => (
    <Button
      variant="secondary"
      size="sm"
      disabled={!canWrite}
      blockedReason={noDrafts}
      onClick={() => onPlace({ kind: 'add', orderId: order.orderId, customerName: order.customerName ?? 'Cliente' })}
    >
      {label}
    </Button>
  );

  return (
    <>
      {(late.data?.length ?? 0) > 0 && (
        <Card className="divide-y divide-outline-soft">
          <div className="px-4 pt-3">
            <CardHeader
              as="h3"
              icon={<Clock />}
              title={`Llegaron después del cierre (${late.data?.length ?? 0})`}
              subtitle="Pedidos para este día que entraron cuando la propuesta ya estaba hecha."
              className="mb-3"
            />
          </div>
          {(late.data ?? []).map((order) => {
            const sheet = order.suggestion && drafts.find((s) => s.id === order.suggestion?.sheetId);
            return (
              <div key={order.orderId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 text-[13px]">
                  <OrderLine order={order} />
                  <p className="text-xs text-muted">Entró el {formatDateTime(order.createdAt)}</p>
                  {order.blockedReason ? (
                    <p className="text-xs text-warn">{order.blockedReason}</p>
                  ) : sheet && order.suggestion ? (
                    <p className="text-xs text-primary-strong">
                      Conviene en {sheetTitle(sheet)}, parada {order.suggestion.position} (+
                      {Math.round(order.suggestion.addedMinutes)} min al recorrido)
                    </p>
                  ) : (
                    <p className="text-xs text-muted">Sin sugerencia: elegí la hoja a mano.</p>
                  )}
                </div>
                {!order.blockedReason &&
                  (sheet && order.suggestion ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!canWrite}
                      onClick={() =>
                        onPlace({
                          kind: 'add',
                          orderId: order.orderId,
                          customerName: order.customerName ?? 'Cliente',
                          sheetId: sheet.id,
                          position: order.suggestion?.position,
                        })
                      }
                    >
                      Agregar donde conviene
                    </Button>
                  ) : (
                    placeButton(order)
                  ))}
              </div>
            );
          })}
        </Card>
      )}
      <Card className="divide-y divide-outline-soft">
        <h4 className="px-4 py-3 text-sm font-semibold text-ink">Sin asignar ({regular.length})</h4>
        {regular.length === 0 && (
          <p className="px-4 py-3 text-[13px] text-muted">Todos los pedidos programados del día están en una hoja.</p>
        )}
        {regular.map((order) => (
          <div key={order.orderId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-[13px]">
              <OrderLine order={order} />
              {order.blockedReason && <p className="text-xs text-warn">{order.blockedReason}</p>}
            </div>
            {!order.blockedReason && placeButton(order)}
          </div>
        ))}
      </Card>
    </>
  );
};
