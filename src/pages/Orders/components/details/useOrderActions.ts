import { useEffect, useRef, useState } from 'react';
import type { Order } from '../../../../services/api/types';
import { errorMessage } from '../../../../services/api/errors';
import {
  useAssignOrderDelivery,
  useCancelOrder,
  useConfirmOrderDelivery,
  useNotifyOrderArrival,
  useOrderDeliveryCode,
  useRegenerateOrderDeliveryCode,
  useUpdateOrderStatus,
} from '../../../../services/queries/orders';
import { confirm, notify } from '../../../../utils/notifications';
import { canViewDeliveryCode, manualStatusActionLabel } from '../orderStatus';

export type OrderModal = 'closed' | 'assign' | 'cancel' | 'confirm' | 'deliver';

/**
 * Todas las acciones operativas de un pedido (asignar, cambiar estado,
 * cancelar, ver y regenerar el código, confirmar la entrega y avisar la llegada) con sus
 * mutaciones, confirmaciones y avisos. Las usa la barra de la ficha.
 */
export const useOrderActions = (order: Order) => {
  const [modal, setModal] = useState<OrderModal>('closed');
  const modalRef = useRef<OrderModal>('closed');
  const manualDeliverySubmitting = useRef(false);
  const confirmDeliverySubmitting = useRef(false);
  const [revealed, setRevealed] = useState<{
    orderId: string;
    code: string;
    attempts: number;
    blocked: boolean;
  } | null>(null);
  const [manualDeliveryError, setManualDeliveryError] = useState<string | null>(null);
  const [confirmDeliveryError, setConfirmDeliveryError] = useState<string | null>(null);
  // El código pertenece al pedido que se consultó: no se arrastra a otro ni sobrevive a un estado que ya no lo admite.
  const shown = revealed?.orderId === order.order_id && canViewDeliveryCode(order.status) ? revealed : null;
  const revealedCode = shown?.code ?? null;
  const codeAttempts = shown?.attempts ?? 0;
  const codeBlocked = shown?.blocked ?? false;
  const assignDelivery = useAssignOrderDelivery();
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const deliveryCode = useOrderDeliveryCode();
  const regenerateCode = useRegenerateOrderDeliveryCode();
  const confirmDelivery = useConfirmOrderDelivery();
  const notifyArrival = useNotifyOrderArrival();

  useEffect(() => {
    modalRef.current = modal;
  }, [modal]);

  const open = (next: OrderModal) => {
    if (next === 'deliver') setManualDeliveryError(null);
    if (next === 'confirm') setConfirmDeliveryError(null);
    setModal(next);
  };
  const close = () => {
    if ((modal === 'deliver' && updateStatus.isPending) || (modal === 'confirm' && confirmDelivery.isPending)) return;
    setModal('closed');
  };

  const assign = (deliveryId: string) =>
    assignDelivery.mutate(
      { id: order.order_id, deliveryId },
      {
        onSuccess: () => {
          notify.success('Chofer asignado');
          close();
        },
        onError: notify.error,
      },
    );

  const cancel = (reason: string) =>
    cancelOrder.mutate(
      { id: order.order_id, body: { reason: reason || undefined } },
      {
        onSuccess: () => {
          notify.success('Pedido cancelado');
          close();
        },
        onError: notify.error,
      },
    );

  const changeStatus = async (target: Order['status']) => {
    if (target === 'delivered') {
      open('deliver');
      return;
    }
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

  const deliverManually = (reason: string) => {
    if (manualDeliverySubmitting.current) return;
    manualDeliverySubmitting.current = true;
    setManualDeliveryError(null);
    const body = { status: 'delivered', reason } as const;
    updateStatus.mutate(
      { id: order.order_id, body, scope: `order:${order.order_id}:deliver-manual` },
      {
        onSuccess: () => {
          notify.success('Estado actualizado');
          close();
        },
        onError: (error) => {
          const message = errorMessage(error);
          if (modalRef.current === 'deliver') setManualDeliveryError(message);
          else notify.error(new Error(message));
        },
        onSettled: () => {
          manualDeliverySubmitting.current = false;
        },
      },
    );
  };

  const viewCode = async () => {
    const confirmed = await confirm({
      title: '¿Ver el código de entrega?',
      text: 'Es el código que el cliente le dice al chofer al recibir el pedido. El chofer no lo ve: no se lo compartas.',
    });
    if (!confirmed) return;
    deliveryCode.mutate(order.order_id, {
      onSuccess: (data) => {
        if (data.deliveryCode) {
          setRevealed({
            orderId: order.order_id,
            code: data.deliveryCode,
            attempts: data.attempts,
            blocked: data.blocked,
          });
        } else notify.info('Este pedido todavía no tiene código de entrega.');
      },
      onError: notify.error,
    });
  };

  const regenerateDeliveryCode = async () => {
    const confirmed = await confirm({
      title: '¿Generar otro código de entrega?',
      text: 'El código anterior deja de servir y los intentos del chofer vuelven a cero. El cliente verá el nuevo en su app.',
    });
    if (!confirmed) return;
    regenerateCode.mutate(order.order_id, {
      onSuccess: (data) => {
        if (data.deliveryCode) {
          setRevealed({
            orderId: order.order_id,
            code: data.deliveryCode,
            attempts: data.attempts,
            blocked: data.blocked,
          });
        }
        notify.success('Código de entrega nuevo generado');
      },
      onError: notify.error,
    });
  };

  const confirmDeliveryManually = (reason: string) => {
    if (confirmDeliverySubmitting.current) return;
    confirmDeliverySubmitting.current = true;
    setConfirmDeliveryError(null);
    const body = { reason };
    confirmDelivery.mutate(
      { id: order.order_id, body, scope: `order:${order.order_id}:confirm-delivery` },
      {
        onSuccess: () => {
          notify.success('Entrega confirmada');
          close();
        },
        onError: (error) => {
          const message = errorMessage(error);
          if (modalRef.current === 'confirm') setConfirmDeliveryError(message);
          else notify.error(new Error(message));
        },
        onSettled: () => {
          confirmDeliverySubmitting.current = false;
        },
      },
    );
  };

  const announceArrival = async () => {
    const confirmed = await confirm({
      title: '¿Avisar al cliente que el chofer llegó?',
      text: 'Le llega un aviso por push y, si tiene la app abierta, también por notificación en vivo.',
    });
    if (!confirmed) return;
    notifyArrival.mutate(order.order_id, {
      onSuccess: (data) => notify.success(data.message),
      onError: notify.error,
    });
  };

  return {
    modal,
    open,
    close,
    revealedCode,
    codeAttempts,
    codeBlocked,
    manualDeliveryError,
    confirmDeliveryError,
    clearManualDeliveryError: () => setManualDeliveryError(null),
    clearConfirmDeliveryError: () => setConfirmDeliveryError(null),
    assignError: assignDelivery.error,
    assign,
    cancel,
    changeStatus,
    deliverManually,
    viewCode,
    regenerateDeliveryCode,
    confirmDeliveryManually,
    announceArrival,
    pending: {
      assign: assignDelivery.isPending,
      cancel: cancelOrder.isPending,
      status: updateStatus.isPending,
      code: deliveryCode.isPending,
      regenerate: regenerateCode.isPending,
      confirm: confirmDelivery.isPending,
      arrival: notifyArrival.isPending,
    },
  };
};
