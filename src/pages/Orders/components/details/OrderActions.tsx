import { useState } from 'react';
import { CircleX, RefreshCw, UserRoundCog } from 'lucide-react';
import { Button, Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { useAssignOrderDelivery, useCancelOrder, useUpdateOrderStatus } from '../../../../services/queries/orders';
import { confirm, notify } from '../../../../utils/notifications';
import { AssignDriverModal } from '../AssignDriverModal';
import { CancelOrderModal } from '../CancelOrderModal';
import { canAssignDriver, canCancel, manualStatusActionLabel, manualStatusTargets } from '../orderStatus';

type ModalState = 'closed' | 'assign' | 'cancel';

/**
 * Gestión operativa del pedido: asignar (o reasignar) chofer, avanzar de
 * estado a mano y cancelar. Sólo se ofrece lo que la máquina de estados del
 * back permite desde el estado actual (ver `orderStatus.ts`).
 */
export const OrderActions = ({ order }: { order: Order }) => {
  const [modal, setModal] = useState<ModalState>('closed');
  const assignDelivery = useAssignOrderDelivery();
  const updateStatus = useUpdateOrderStatus();
  const cancelOrderMutation = useCancelOrder();

  const targets = manualStatusTargets(order.status);
  if (!canAssignDriver(order.status) && targets.length === 0 && !canCancel(order.status)) return null;

  const handleAssign = (deliveryId: string) => {
    assignDelivery.mutate(
      { id: order.order_id, deliveryId },
      {
        onSuccess: () => {
          notify.success('Chofer asignado');
          setModal('closed');
        },
        onError: notify.error,
      },
    );
  };

  const handleCancel = (reason: string) => {
    cancelOrderMutation.mutate(
      { id: order.order_id, body: { reason: reason || undefined } },
      {
        onSuccess: () => {
          notify.success('Pedido cancelado');
          setModal('closed');
        },
        onError: notify.error,
      },
    );
  };

  const handleManualStatus = async (target: Order['status']) => {
    const confirmed = await confirm({
      title: `¿${manualStatusActionLabel(order.status, target)}?`,
      text: 'Cambio de estado manual: no pasa por el flujo normal de despacho.',
    });
    if (!confirmed) return;
    updateStatus.mutate(
      { id: order.order_id, body: { status: target } },
      { onSuccess: () => notify.success('Estado actualizado'), onError: notify.error },
    );
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Gestión del pedido</h3>
      <div className="flex flex-wrap gap-2">
        {canAssignDriver(order.status) && (
          <Button variant="secondary" size="sm" icon={<UserRoundCog />} onClick={() => setModal('assign')}>
            {order.delivery_id ? 'Reasignar chofer' : 'Asignar chofer'}
          </Button>
        )}
        {targets.map((target) => (
          <Button
            key={target}
            variant="secondary"
            size="sm"
            icon={<RefreshCw />}
            disabled={updateStatus.isPending}
            onClick={() => void handleManualStatus(target)}
          >
            {manualStatusActionLabel(order.status, target)}
          </Button>
        ))}
        {canCancel(order.status) && (
          <Button variant="danger" size="sm" icon={<CircleX />} onClick={() => setModal('cancel')}>
            Cancelar pedido
          </Button>
        )}
      </div>

      <AssignDriverModal
        open={modal === 'assign'}
        onClose={() => setModal('closed')}
        onConfirm={handleAssign}
        assigning={assignDelivery.isPending}
      />
      <CancelOrderModal
        open={modal === 'cancel'}
        onClose={() => setModal('closed')}
        onConfirm={handleCancel}
        cancelling={cancelOrderMutation.isPending}
      />
    </Card>
  );
};
