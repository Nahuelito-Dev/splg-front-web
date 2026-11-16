import { useState } from 'react';
import { ExpensePaymentRow, PayExpenseModal } from '../../../common/components/expensePayment';
import { usePermissions } from '../../../hooks';
import type { FuelLoadV2 } from '../../../services/api/types';
import { usePayFuelLoad } from '../../../services/queries/fleetExpense';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

/**
 * El pago de una carga de combustible desde una caja. La que pagó el chofer con su efectivo se salda en su
 * rendición: no se ofrece pagarla acá.
 */
export const FuelLoadPayment = ({ load }: { load: FuelLoadV2 }) => {
  const { canWrite, writeHint } = usePermissions();
  const pay = usePayFuelLoad();
  const [open, setOpen] = useState(false);
  if (load.voidedAt) return null;
  const byDriver = load.paymentMethod === 'driver_cash';

  return (
    <>
      <ExpensePaymentRow
        title="Pago de la carga"
        paid={load.isPaid}
        paidAt={load.paidAt}
        amount={load.totalAmount}
        actionLabel={load.isPayable ? 'Registrar pago' : undefined}
        onAction={() => setOpen(true)}
        blockedReason={canWrite ? undefined : writeHint}
        note={
          byDriver
            ? 'La pagó el chofer con su efectivo: se salda en su rendición'
            : !load.isPaid && !load.isPayable
              ? 'Anterior al asiento de caja: se resolvió fuera del libro'
              : undefined
        }
        unpaidLabel={byDriver ? 'A rendir por el chofer' : 'Sin pagar'}
      />
      <PayExpenseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar pago"
        description={`${load.carPatent ?? 'Vehículo'} · ${formatCurrency(load.totalAmount)}`}
        notBefore={load.loadedAt}
        notBeforeMessage="El pago no puede ser anterior a la fecha de la carga"
        pending={pay.isPending}
        onSubmit={({ cashBoxId, at }) =>
          pay.mutate(
            { id: load.fuelLoadId, body: { cashBoxId, paidAt: at } },
            {
              onSuccess: () => {
                notify.success('Pago registrado: la carga quedó paga');
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
