import { useState } from 'react';
import { ExpensePaymentRow, PayExpenseModal } from '../../../common/components/expensePayment';
import { usePermissions } from '../../../hooks';
import type { TireV2 } from '../../../services/api/types';
import { usePayTire } from '../../../services/queries/fleetExpense';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

/** El pago de la compra de un neumático: sale de una caja de efectivo, banco o billetera. */
export const TirePayment = ({ tire }: { tire: TireV2 }) => {
  const { canWrite, writeHint } = usePermissions();
  const pay = usePayTire();
  const [open, setOpen] = useState(false);
  const hasCost = tire.cost > 0;

  return (
    <>
      <ExpensePaymentRow
        title="Pago de la compra"
        paid={tire.isPaid}
        paidAt={tire.paidAt}
        amount={tire.cost}
        actionLabel={hasCost ? 'Registrar pago' : undefined}
        onAction={() => setOpen(true)}
        blockedReason={canWrite ? undefined : writeHint}
        note={hasCost ? undefined : 'Sin costo cargado'}
      />
      <PayExpenseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar pago"
        description={`${tire.brand} ${tire.size} · ${formatCurrency(tire.cost)}`}
        notBefore={tire.createdAt}
        notBeforeMessage="El pago no puede ser anterior a la compra del neumático"
        pending={pay.isPending}
        onSubmit={({ cashBoxId, at }) =>
          pay.mutate(
            { id: tire.tireId, body: { cashBoxId, paidAt: at } },
            {
              onSuccess: () => {
                notify.success('Pago registrado: el neumático quedó pago');
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
