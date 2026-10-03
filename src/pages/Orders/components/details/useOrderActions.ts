import { useState } from 'react';
import type { Order } from '../../../../services/api/types';
import {
  useAssignOrderDelivery,
  useCancelOrder,
  useConfirmOrderDelivery,
  useNotifyOrderArrival,
  useOrderDeliveryCode,
  useUpdateOrderStatus,
} from '../../../../services/queries/orders';
import { confirm, notify } from '../../../../utils/notifications';
import { canViewDeliveryCode, manualStatusActionLabel } from '../orderStatus';

export type OrderModal = 'closed' | 'assign' | 'cancel' | 'confirm';

/**
 * Todas las acciones operativas de un pedido (asignar, cambiar estado,
 * cancelar, ver el código, confirmar la entrega y avisar la llegada) con sus
 * mutaciones, confirmaciones y avisos. Las usa la barra de la ficha.
 */
export const useOrderActions = (order: Order) => {
  const [modal, setModal] = useState<OrderModal>('closed');
  const [revealed, setRevealed] = useState<{ orderId: string; code: string } | null>(null);
  // El código pertenece al pedido que se consultó: no se arrastra a otro ni sobrevive a un estado que ya no lo admite.
  const revealedCode = revealed?.orderId === order.order_id && canViewDeliveryCode(order.status) ? revealed.code : null;
  const assignDelivery = useAssignOrderDelivery();
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const deliveryCode = useOrderDeliveryCode();
  const confirmDelivery = useConfirmOrderDelivery();
  const notifyArrival = useNotifyOrderArrival();
  const close = () => setModal('closed');

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

  const viewCode = async () => {
    const confirmed = await confirm({
      title: '¿Ver el código de entrega?',
      text: 'Es el código secreto del QR del chofer: compartilo sólo con el cliente o con el chofer de este pedido.',
    });
    if (!confirmed) return;
    deliveryCode.mutate(order.order_id, {
      onSuccess: (data) => {
        if (data.deliveryCode) setRevealed({ orderId: order.order_id, code: data.deliveryCode });
        else notify.info('Este pedido todavía no tiene código de entrega.');
      },
      onError: notify.error,
    });
  };

  const confirmDeliveryWithCode = (code: string) =>
    confirmDelivery.mutate(
      { id: order.order_id, body: { code } },
      {
        onSuccess: () => {
          notify.success('Entrega confirmada');
          close();
        },
        onError: notify.error,
      },
    );

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
    open: setModal,
    close,
    revealedCode,
    assign,
    cancel,
    changeStatus,
    viewCode,
    confirmDeliveryWithCode,
    announceArrival,
    pending: {
      assign: assignDelivery.isPending,
      cancel: cancelOrder.isPending,
      status: updateStatus.isPending,
      code: deliveryCode.isPending,
      confirm: confirmDelivery.isPending,
      arrival: notifyArrival.isPending,
    },
  };
};
