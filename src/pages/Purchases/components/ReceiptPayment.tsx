import { useState } from 'react';
import { ExpensePaymentRow, PayExpenseModal } from '../../../common/components/expensePayment';
import { usePermissions } from '../../../hooks';
import type { PurchaseReceiptV2 } from '../../../services/api/types';
import { usePayPurchaseReceipt } from '../../../services/queries/purchases';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

/**
 * El pago de una recepción de compra: el total sale de una caja de efectivo, banco o billetera. Para corregir
 * un pago se la marca sin pagar (contraasiento en la caja).
 */
export const ReceiptPayment = ({ receipt }: { receipt: PurchaseReceiptV2 }) => {
  const { canWrite, writeHint } = usePermissions();
  const pay = usePayPurchaseReceipt();
  const [open, setOpen] = useState(false);
  const payable = receipt.status === 'confirmed' && receipt.totalAmount > 0;

  return (
    <>
      <ExpensePaymentRow
        title="Pago de la compra"
        paid={receipt.isPaid}
        paidAt={receipt.paidAt}
        amount={receipt.totalAmount}
        actionLabel={payable ? 'Registrar pago' : undefined}
        onAction={() => setOpen(true)}
        blockedReason={canWrite ? undefined : writeHint}
      />
      <PayExpenseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar pago"
        description={`Recepción N° ${receipt.number} · ${formatCurrency(receipt.totalAmount)}`}
        notBefore={receipt.receivedAt}
        notBeforeMessage="El pago no puede ser anterior a la recepción"
        pending={pay.isPending}
        onSubmit={({ cashBoxId, at }) =>
          pay.mutate(
            { id: receipt.receiptId, body: { cashBoxId, paidAt: at } },
            {
              onSuccess: () => {
                notify.success('Pago registrado: la recepción quedó pagada');
                setOpen(false);
              },
              onError: notify.error,
            },
          )
        }
      />
    </>
  );
};
