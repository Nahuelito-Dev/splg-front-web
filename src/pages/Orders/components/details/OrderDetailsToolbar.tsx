import { BellRing, CircleX, KeyRound, PackageCheck, Printer, RefreshCw, UserRoundCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, PageHeader } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../../utils/format';
import { labelOf, ORDER_STATUS } from '../../../../utils/statusLabels';
import { AssignDriverModal } from '../AssignDriverModal';
import { CancelOrderModal } from '../CancelOrderModal';
import { ConfirmDeliveryModal } from '../ConfirmDeliveryModal';
import {
  canAssignDriver,
  canCancel,
  canConfirmDelivery,
  canNotifyArrival,
  canViewDeliveryCode,
  manualStatusActionLabel,
  manualStatusTargets,
} from '../orderStatus';
import { useOrderActions } from './useOrderActions';

/**
 * Encabezado de la ficha: ruta, número y estado del pedido, fecha y las
 * acciones que el estado permite (ver `orderStatus.ts`). El imprimir remito
 * está siempre disponible.
 */
export const OrderDetailsToolbar = ({ order }: { order: Order }) => {
  const actions = useOrderActions(order);
  const targets = manualStatusTargets(order.status);

  return (
    <>
      <PageHeader
        title={`Pedido ${formatShortId(order.order_id)}`}
        badges={<Badge label={labelOf(ORDER_STATUS, order.status)} />}
        description={`Creado ${formatDateTime(order.created_at)}`}
        actions={
          <>
            {canAssignDriver(order.status) && (
              <Button variant="secondary" size="sm" icon={<UserRoundCog />} onClick={() => actions.open('assign')}>
                {order.delivery_id ? 'Reasignar chofer' : 'Asignar chofer'}
              </Button>
            )}
            {targets.map((target) => (
              <Button
                key={target}
                variant="secondary"
                size="sm"
                icon={<RefreshCw />}
                disabled={actions.pending.status}
                onClick={() => void actions.changeStatus(target)}
              >
                {manualStatusActionLabel(order.status, target)}
              </Button>
            ))}
            {canViewDeliveryCode(order.status) && (
              <Button
                variant="secondary"
                size="sm"
                icon={<KeyRound />}
                loading={actions.pending.code}
                onClick={() => void actions.viewCode()}
              >
                Ver código
              </Button>
            )}
            {canNotifyArrival(order.status) && (
              <Button
                variant="secondary"
                size="sm"
                icon={<BellRing />}
                loading={actions.pending.arrival}
                onClick={() => void actions.announceArrival()}
              >
                Avisar llegada
              </Button>
            )}
            {canConfirmDelivery(order.status) && (
              <Button size="sm" icon={<PackageCheck />} onClick={() => actions.open('confirm')}>
                Confirmar entrega
              </Button>
            )}
            {canCancel(order.status) && (
              <Button variant="danger" size="sm" icon={<CircleX />} onClick={() => actions.open('cancel')}>
                Cancelar pedido
              </Button>
            )}
            <Link
              to={`/orders/${order.order_id}/remito`}
              className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-outline bg-surface px-3 text-xs font-semibold text-ink shadow-control transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&_svg]:h-4 [&_svg]:w-4"
            >
              <Printer aria-hidden="true" /> Imprimir remito
            </Link>
          </>
        }
      />

      {actions.revealedCode && (
        <div className="mt-4 rounded-lg border border-warn/30 bg-warn-soft p-3">
          <p className="text-xs text-warn">Código sensible: es la prueba de entrega, no lo publiques ni lo guardes.</p>
          <p className="mt-1 break-all font-mono text-lg font-semibold tracking-widest text-ink">
            {actions.revealedCode}
          </p>
        </div>
      )}

      <AssignDriverModal
        open={actions.modal === 'assign'}
        onClose={actions.close}
        onConfirm={actions.assign}
        assigning={actions.pending.assign}
        distributorId={order.distributor_id}
      />
      <CancelOrderModal
        open={actions.modal === 'cancel'}
        onClose={actions.close}
        onConfirm={actions.cancel}
        cancelling={actions.pending.cancel}
      />
      <ConfirmDeliveryModal
        open={actions.modal === 'confirm'}
        onClose={actions.close}
        onConfirm={actions.confirmDeliveryWithCode}
        confirming={actions.pending.confirm}
        defaultCode={actions.revealedCode ?? ''}
      />
    </>
  );
};
