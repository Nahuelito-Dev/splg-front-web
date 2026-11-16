import {
  BellRing,
  CircleX,
  KeyRound,
  PackageCheck,
  FileText,
  PencilLine,
  Receipt,
  RefreshCw,
  UserRoundCog,
} from 'lucide-react';
import { useState } from 'react';
import {
  AuditHistoryLink,
  Badge,
  Button,
  PageHeader,
  ReasonModal,
  type MenuAction,
} from '../../../../common/components/ui';
import { MessageButton } from '../../../../features/chat/inbox/MessageButton';
import { usePdfDownload, usePermissions } from '../../../../hooks';
import type { Order } from '../../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../../utils/format';
import { labelOf, ORDER_STATUS, paymentStatusLabel } from '../../../../utils/statusLabels';
import { AssignDriverModal } from '../AssignDriverModal';
import { CancelOrderModal } from '../CancelOrderModal';
import { EditOrderModal } from '../EditOrderModal';
import { orderEditBlockedReason } from '../orderEdit';
import { ConfirmDeliveryModal } from '../ConfirmDeliveryModal';
import { deliveryReasonCounter, deliveryReasonError } from '../deliveryReason';
import {
  assignPaymentBlock,
  canAssignDriver,
  canCancel,
  canConfirmDelivery,
  canIssueReceipt,
  canNotifyArrival,
  canViewDeliveryCode,
  manualStatusActionLabel,
  manualStatusTargets,
} from '../orderStatus';
import { OrderPaymentActions } from './OrderPaymentActions';
import { ResolveUnpaidAction } from './ResolveUnpaidAction';
import { useOrderActions } from './useOrderActions';

/**
 * Encabezado de la ficha: ruta, número y estado del pedido, fecha y las
 * acciones que el estado permite (ver `orderStatus.ts`). El remito (PDF) está siempre disponible; el recibo, sólo
 * con el pedido cobrado y no cancelado.
 */
export const OrderDetailsToolbar = ({ order }: { order: Order }) => {
  const actions = useOrderActions(order);
  const { canWrite, writeHint, canOperate, operateHint, readOnly } = usePermissions();
  // La API rechaza con 400 toda escritura sobre un pedido sin distribuidora (administrador general sin «Ver como»).
  const blockedReason = canOperate ? undefined : operateHint;
  const [editing, setEditing] = useState(false);
  const editBlocked = orderEditBlockedReason(order);
  const targets = manualStatusTargets(order.status);
  const pdf = usePdfDownload();
  // Un PDF no escribe: en modo soporte depende del alcance «exportes», no del sólo lectura.
  const pdfBlockedReason = readOnly ? pdf.blockedReason : operateHint;

  // La primaria es la que avanza el pedido según su estado: confirmar la entrega o, antes, asignar el chofer.
  const assignLabel = order.delivery_id ? 'Reasignar chofer' : 'Asignar chofer';
  const assignBlockedReason = blockedReason ?? assignPaymentBlock(order);
  const confirmIsPrimary = canConfirmDelivery(order.status);
  const assignIsPrimary = !confirmIsPrimary && canAssignDriver(order.status);
  const primary = confirmIsPrimary ? (
    <Button size="sm" icon={<PackageCheck />} blockedReason={blockedReason} onClick={() => actions.open('confirm')}>
      Confirmar entrega
    </Button>
  ) : assignIsPrimary ? (
    <Button
      size="sm"
      icon={<UserRoundCog />}
      blockedReason={assignBlockedReason}
      onClick={() => actions.open('assign')}
    >
      {assignLabel}
    </Button>
  ) : null;
  const secondary: MenuAction[] = [
    {
      label: 'Editar pedido',
      icon: <PencilLine />,
      disabled: !canWrite,
      title: writeHint,
      blockedReason: canWrite && editBlocked ? `No se puede editar: ${editBlocked}` : undefined,
      onClick: () => setEditing(true),
    },
    ...(canAssignDriver(order.status) && !assignIsPrimary
      ? [
          {
            label: assignLabel,
            icon: <UserRoundCog />,
            blockedReason: assignBlockedReason,
            onClick: () => actions.open('assign'),
          },
        ]
      : []),
    ...targets.map((target) => ({
      label: manualStatusActionLabel(order.status, target),
      icon: <RefreshCw />,
      disabled: actions.pending.status,
      blockedReason,
      onClick: () => void actions.changeStatus(target),
    })),
    ...(canViewDeliveryCode(order.status)
      ? [
          {
            label: 'Ver código',
            icon: <KeyRound />,
            disabled: actions.pending.code,
            onClick: () => void actions.viewCode(),
          },
        ]
      : []),
    ...(canNotifyArrival(order.status)
      ? [
          {
            label: 'Avisar llegada',
            icon: <BellRing />,
            disabled: actions.pending.arrival,
            blockedReason,
            onClick: () => void actions.announceArrival(),
          },
        ]
      : []),
    {
      label: 'Remito (PDF)',
      icon: <FileText />,
      disabled: pdf.pending,
      // El back arma el PDF con la distribuidora del pedido: el administrador general tiene que elegirla.
      blockedReason: pdfBlockedReason,
      onClick: () => pdf.download({ kind: 'order-remito', orderId: order.order_id }),
    },
    ...(canIssueReceipt(order)
      ? [
          {
            label: 'Recibo (PDF)',
            icon: <Receipt />,
            disabled: pdf.pending,
            blockedReason: pdfBlockedReason,
            onClick: () => pdf.download({ kind: 'order-recibo', orderId: order.order_id }),
          },
        ]
      : []),
    ...(canCancel(order.status)
      ? [
          {
            label: 'Cancelar pedido',
            icon: <CircleX />,
            tone: 'danger' as const,
            blockedReason,
            onClick: () => actions.open('cancel'),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title={`Pedido ${formatShortId(order.order_id)}`}
        badges={
          <>
            <Badge label={labelOf(ORDER_STATUS, order.status)} />
            {order.paymentStatus && (
              <Badge label={paymentStatusLabel(order.paymentStatus, order.paymentMethodDetail)} />
            )}
          </>
        }
        description={`Creado ${formatDateTime(order.created_at)}`}
        actions={
          <>
            <AuditHistoryLink entity="Order" recordId={order.order_id} />
            <MessageButton
              target={{
                kind: 'order',
                orderId: order.order_id,
                label: `pedido ${formatShortId(order.order_id)}`,
                customerName: order.customer ? (order.customer.full_name ?? 'el cliente') : null,
                driverName: order.delivery_id ? (order.delivery_name ?? 'el chofer asignado') : null,
              }}
            />
            {primary}
            {order.paymentStatus === 'unpaid' && <ResolveUnpaidAction order={order} />}
            <OrderPaymentActions order={order} />
          </>
        }
        secondaryActions={secondary}
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
        error={actions.assignError}
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
