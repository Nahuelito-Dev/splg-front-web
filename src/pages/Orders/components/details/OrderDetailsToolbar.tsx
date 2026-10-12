import { BellRing, CircleX, KeyRound, PackageCheck, PencilLine, Printer, RefreshCw, UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuditHistoryLink, Badge, Button, PageHeader, ReasonModal } from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import type { Order } from '../../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../../utils/format';
import { labelOf, ORDER_STATUS, PAYMENT_STATUS } from '../../../../utils/statusLabels';
import { AssignDriverModal } from '../AssignDriverModal';
import { CancelOrderModal } from '../CancelOrderModal';
import { EditOrderModal } from '../EditOrderModal';
import { orderEditBlockedReason } from '../orderEdit';
import { ConfirmDeliveryModal } from '../ConfirmDeliveryModal';
import { deliveryReasonCounter, deliveryReasonError } from '../deliveryReason';
import {
  canAssignDriver,
  canCancel,
  canConfirmDelivery,
  canNotifyArrival,
  canViewDeliveryCode,
  manualStatusActionLabel,
  manualStatusTargets,
} from '../orderStatus';
import { ResolveUnpaidAction } from './ResolveUnpaidAction';
import { useOrderActions } from './useOrderActions';

/**
 * Encabezado de la ficha: ruta, número y estado del pedido, fecha y las
 * acciones que el estado permite (ver `orderStatus.ts`). El imprimir remito
 * está siempre disponible.
 */
export const OrderDetailsToolbar = ({ order }: { order: Order }) => {
  const actions = useOrderActions(order);
  const { canWrite, writeHint } = usePermissions();
  const [editing, setEditing] = useState(false);
  const editBlocked = orderEditBlockedReason(order);
  const targets = manualStatusTargets(order.status);

  return (
    <>
      <PageHeader
        title={`Pedido ${formatShortId(order.order_id)}`}
        badges={
          <>
            <Badge label={labelOf(ORDER_STATUS, order.status)} />
            {order.paymentStatus && <Badge label={labelOf(PAYMENT_STATUS, order.paymentStatus)} />}
          </>
        }
        description={`Creado ${formatDateTime(order.created_at)}`}
        actions={
          <>
            <AuditHistoryLink entity="Order" recordId={order.order_id} />
            <Button
              variant="secondary"
              size="sm"
              icon={<PencilLine />}
              disabled={!canWrite}
              title={writeHint}
              blockedReason={canWrite && editBlocked ? `No se puede editar: ${editBlocked}` : undefined}
              onClick={() => setEditing(true)}
            >
              Editar pedido
            </Button>
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
            {order.paymentStatus === 'unpaid' && <ResolveUnpaidAction order={order} />}
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

      <EditOrderModal order={editing ? order : null} onClose={() => setEditing(false)} />
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
      <ReasonModal
        open={actions.modal === 'deliver'}
        onClose={actions.close}
        title="Marcar como entregado"
        description="Esta entrega se registra manualmente. Indicá por qué se confirma desde el panel."
        placeholder="Ej: El cliente llamó para confirmar la recepción."
        confirmLabel="Marcar como entregado"
        danger={false}
        onConfirm={actions.deliverManually}
        loading={actions.pending.status}
        closeBlocked={actions.pending.status}
        validateReason={deliveryReasonError}
        reasonHint={deliveryReasonCounter}
        serverError={actions.manualDeliveryError}
        onReasonChange={actions.clearManualDeliveryError}
      />
      <ConfirmDeliveryModal
        open={actions.modal === 'confirm'}
        onClose={actions.close}
        onConfirm={actions.confirmDeliveryWithCode}
        confirming={actions.pending.confirm}
        error={actions.confirmDeliveryError}
        onEdit={actions.clearConfirmDeliveryError}
        defaultCode={actions.revealedCode ?? ''}
      />
    </>
  );
};
