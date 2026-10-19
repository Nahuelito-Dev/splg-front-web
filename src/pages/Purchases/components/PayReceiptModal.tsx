import { useEffect, useState } from 'react';
import { Button, Checkbox, Modal } from '../../../common/components/ui';
import type { PurchaseReceipt } from '../../../services/api/types';
import { useUpdateReceiptPaymentStatus } from '../../../services/queries/purchases';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { CashBoxField } from '../../Orders/components/CashBoxField';
import { useOrderCashBoxes } from '../../Orders/components/useOrderCashBoxes';

interface Props {
  receipt: PurchaseReceipt | null;
  onClose: () => void;
}

/** Marcar una recepción como pagada; si fue en efectivo, el total sale de la caja elegida. Una pagada no se anula. */
export const PayReceiptModal = ({ receipt, onClose }: Props) => {
  const setPayment = useUpdateReceiptPaymentStatus();
  const [inCash, setInCash] = useState(false);
  const [cashBoxId, setCashBoxId] = useState('');
  const [touched, setTouched] = useState(false);
  const cashBoxes = useOrderCashBoxes(receipt !== null && inCash);
  const needsBox = inCash && cashBoxes.required;
  const boxError = touched && needsBox && !cashBoxId ? 'Elegí la caja de la que sale el efectivo' : undefined;

  useEffect(() => {
    setInCash(false);
    setCashBoxId('');
    setTouched(false);
  }, [receipt]);

  const submit = () => {
    setTouched(true);
    if (!receipt) return;
    if (inCash && (cashBoxes.loading || cashBoxes.failed)) {
      notify.error(new Error('No pudimos cargar las cajas: probá de nuevo'));
      return;
    }
    if (needsBox && !cashBoxId) return;
    setPayment.mutate(
      {
        id: receipt.receiptId,
        body: { paymentStatus: 'paid', ...(inCash ? { paidInCash: true, cashBoxId: cashBoxId || undefined } : {}) },
      },
      {
        onSuccess: () => {
          notify.success('Marcada como pagada');
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  return (
    <Modal
      open={receipt !== null}
      onClose={onClose}
      closeBlocked={setPayment.isPending}
      title="Marcar como pagada"
      description={receipt ? `Recepción N° ${receipt.number} · ${formatCurrency(receipt.totalAmount)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={setPayment.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={setPayment.isPending}>
            Marcar pagada
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm text-muted">Una recepción pagada no se puede anular.</p>
        <Checkbox
          label="Se pagó en efectivo de una caja"
          hint="El total de la recepción sale de la caja que elijas."
          checked={inCash}
          onChange={(e) => setInCash(e.target.checked)}
        />
        {inCash && (
          <CashBoxField
            boxes={cashBoxes.boxes}
            value={cashBoxId}
            onChange={setCashBoxId}
            error={boxError}
            hint="El efectivo sale de esta caja. Si exige sesión, tiene que estar abierta."
          />
        )}
      </div>
    </Modal>
  );
};
