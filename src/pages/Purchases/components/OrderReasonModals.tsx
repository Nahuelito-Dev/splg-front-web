import { useEffect, useState } from 'react';
import { ReasonModal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { PurchaseOrder } from '../../../services/api/types';
import { useCancelPurchaseOrder, useCloseShortPurchaseOrder } from '../../../services/queries/purchases';
import { notify } from '../../../utils/notifications';

interface Props {
  /** La orden sobre la que se actúa; `null` cierra el modal. */
  order: PurchaseOrder | null;
  onClose: () => void;
}

const ServerError = ({ message }: { message: string | null }) =>
  message ? (
    <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  ) : null;

/** Cancelar una orden en borrador o enviada. Con recepciones confirmadas la API responde 409: se muestra tal cual. */
export const CancelOrderModal = ({ order, onClose }: Props) => {
  const cancel = useCancelPurchaseOrder();
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => setServerError(null), [order]);
  return (
    <ReasonModal
      open={order !== null}
      onClose={onClose}
      title={order ? `Cancelar orden N° ${order.number}` : 'Cancelar orden'}
      description="La orden queda cancelada: significa que no se compró nada. No se puede deshacer."
      confirmLabel="Cancelar orden"
      loading={cancel.isPending}
      onConfirm={(reason) => {
        if (!order) return;
        setServerError(null);
        cancel.mutate(
          { id: order.purchaseOrderId, body: { reason } },
          {
            onSuccess: () => {
              notify.success('Orden cancelada');
              onClose();
            },
            onError: (error) => setServerError(errorMessage(error)),
          },
        );
      }}
    >
      <ServerError message={serverError} />
    </ReasonModal>
  );
};

/** Cerrar con faltante: lo que falta recibir ya no llega. La orden conserva lo recibido. */
export const CloseShortModal = ({ order, onClose }: Props) => {
  const closeShort = useCloseShortPurchaseOrder();
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => setServerError(null), [order]);
  return (
    <ReasonModal
      open={order !== null}
      onClose={onClose}
      title={order ? `Cerrar con faltante la orden N° ${order.number}` : 'Cerrar con faltante'}
      description={
        order
          ? `Faltan ${order.pendingQuantity} garrafas que ya no van a llegar. La orden queda cerrada y lo recibido se conserva.`
          : ''
      }
      reasonLabel="Motivo del faltante"
      confirmLabel="Cerrar con faltante"
      loading={closeShort.isPending}
      onConfirm={(reason) => {
        if (!order) return;
        setServerError(null);
        closeShort.mutate(
          { id: order.purchaseOrderId, body: { reason } },
          {
            onSuccess: () => {
              notify.success('Orden cerrada con faltante');
              onClose();
            },
            onError: (error) => setServerError(errorMessage(error)),
          },
        );
      }}
    >
      <ServerError message={serverError} />
    </ReasonModal>
  );
};
