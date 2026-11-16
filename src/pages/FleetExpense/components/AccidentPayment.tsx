import Decimal from 'decimal.js';
import { useState } from 'react';
import { ExpensePaymentRow, PayExpenseModal } from '../../../common/components/expensePayment';
import { usePermissions } from '../../../hooks';
import type { VehicleAccidentV2 } from '../../../services/api/types';
import { usePayVehicleAccident, useReceiveAccidentReimbursement } from '../../../services/queries/fleetExpense';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

type Action = 'pay' | 'reimbursement' | null;

/**
 * Lo que pagó la empresa por el siniestro (reparación o franquicia: egreso) y el reintegro del seguro (ingreso).
 * Cada uno se registra una sola vez. Cerrado, los importes no pueden superar lo cargado al cerrar.
 */
export const AccidentPayment = ({ accident }: { accident: VehicleAccidentV2 }) => {
  const { canWrite, writeHint } = usePermissions();
  const pay = usePayVehicleAccident();
  const reimburse = useReceiveAccidentReimbursement();
  const [action, setAction] = useState<Action>(null);
  const closed = accident.status === 'closed';
  const payCap = closed ? Decimal.max(accident.repairCost ?? 0, accident.deductibleAmount ?? 0).toNumber() : null;
  const reimbursementCap = closed ? (accident.insurerReimbursement ?? 0) : null;
  const blocked = canWrite ? undefined : writeHint;
  const close = () => setAction(null);

  return (
    <div className="space-y-2">
      <ExpensePaymentRow
        title="Pago de la empresa (reparación o franquicia)"
        paid={accident.isPaid}
        paidAt={accident.paymentPaidAt}
        amount={accident.paymentAmount}
        actionLabel={payCap === 0 ? undefined : 'Registrar pago'}
        onAction={() => setAction('pay')}
        blockedReason={blocked}
        note={payCap === 0 ? 'Se cerró sin costo de reparación ni franquicia' : undefined}
      />
      <ExpensePaymentRow
        title="Reintegro del seguro"
        paid={accident.isReimbursed}
        paidLabel="Recibido"
        unpaidLabel="Sin recibir"
        paidAt={accident.reimbursementReceivedAt}
        amount={accident.reimbursementAmount}
        actionLabel={reimbursementCap === 0 ? undefined : 'Registrar reintegro del seguro'}
        onAction={() => setAction('reimbursement')}
        blockedReason={blocked}
        note={reimbursementCap === 0 ? 'Se cerró sin reintegro del seguro' : undefined}
      />
      <PayExpenseModal
        open={action === 'pay'}
        onClose={close}
        title="Registrar pago"
        description={`${accident.carPatent ?? 'Siniestro'} · lo que pagó la empresa`}
        amount={{ initial: 0, max: payCap, label: 'Importe pagado' }}
        notBefore={accident.occurredAt}
        notBeforeMessage="El pago no puede ser anterior al siniestro"
        pending={pay.isPending}
        onSubmit={({ cashBoxId, at, amount }) =>
          pay.mutate(
            { id: accident.accidentId, body: { cashBoxId, paidAt: at, amount: amount ?? 0 } },
            {
              onSuccess: () => {
                notify.success('Pago registrado');
                close();
              },
              onError: notify.error,
            },
          )
        }
      />
      <PayExpenseModal
        open={action === 'reimbursement'}
        onClose={close}
        income
        title="Registrar reintegro del seguro"
        description={`${accident.carPatent ?? 'Siniestro'}${
          reimbursementCap ? ` · cargado al cerrar ${formatCurrency(reimbursementCap)}` : ''
        }`}
        amount={{ initial: reimbursementCap ?? 0, max: reimbursementCap, label: 'Importe recibido' }}
        notBefore={accident.occurredAt}
        notBeforeMessage="El reintegro no puede ser anterior al siniestro"
        submitLabel="Registrar reintegro"
        pending={reimburse.isPending}
        onSubmit={({ cashBoxId, at, amount }) =>
          reimburse.mutate(
            { id: accident.accidentId, body: { cashBoxId, receivedAt: at, amount: amount ?? 0 } },
            {
              onSuccess: () => {
                notify.success('Reintegro registrado: entró a la caja');
                close();
              },
              onError: notify.error,
            },
          )
        }
      />
    </div>
  );
};
