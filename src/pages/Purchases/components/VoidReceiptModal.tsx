import { useEffect, useState } from 'react';
import { ReasonModal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { PurchaseReceipt } from '../../../services/api/types';
import { useVoidPurchaseReceipt } from '../../../services/queries/purchases';
import { notify } from '../../../utils/notifications';

interface Props {
  /** La recepción que se anula; `null` cierra el modal. */
  receipt: PurchaseReceipt | null;
  onClose: () => void;
}

/**
 * Anular una recepción: contraasiento de su lote. Si las llenas ya no están en el galpón (vendidas, cargadas a un
 * camión, transferidas) la API responde 409 y dice dónde están hoy: el mensaje se muestra entero, dentro del modal.
 */
export const VoidReceiptModal = ({ receipt, onClose }: Props) => {
  const voidReceipt = useVoidPurchaseReceipt();
  const scope = `void:${receipt?.receiptId ?? ''}`;
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => setServerError(null), [receipt]);
  return (
    <ReasonModal
      open={receipt !== null}
      onClose={onClose}
      title={receipt ? `Anular recepción N° ${receipt.number}` : 'Anular recepción'}
      description="Las llenas salen del galpón y las vacías vuelven. Se corrige el costo promedio. No se puede deshacer."
      confirmLabel="Anular recepción"
      loading={voidReceipt.isPending}
      onConfirm={(reason) => {
        if (!receipt) return;
        setServerError(null);
        voidReceipt.mutate(
          { id: receipt.receiptId, body: { reason }, scope },
          {
            onSuccess: () => {
              notify.success('Recepción anulada');
              onClose();
            },
            onError: (error) => setServerError(errorMessage(error)),
          },
        );
      }}
    >
      {serverError && (
        <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {serverError}
        </p>
      )}
    </ReasonModal>
  );
};
