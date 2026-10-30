import { useState } from 'react';
import { ExpensePaymentRow, PayExpenseModal } from '../../../common/components/expensePayment';
import { ErrorState, LoadingState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useFleetTask, usePayFleetTask } from '../../../services/queries/fleet';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

/** El pago de una tarea hecha con costo (VTV, service, frenos…): sale de una caja de efectivo, banco o billetera. */
export const FleetTaskPayment = ({ taskId }: { taskId: string }) => {
  const { canWrite, writeHint } = usePermissions();
  const { data: task, isPending, error, refetch } = useFleetTask(taskId);
  const pay = usePayFleetTask();
  const [open, setOpen] = useState(false);

  if (isPending) return <LoadingState />;
  if (error || !task) return <ErrorState error={error} resource="El pago de la tarea" onRetry={() => void refetch()} />;
  const cost = task.cost ?? 0;
  if (task.status !== 'done' || cost <= 0) return null;
  // El seguro se paga por las cuotas de su póliza: acá no se ofrece pagarlo (se evita pagarlo dos veces).
  if (task.notPayableReason) {
    return (
      <ExpensePaymentRow title="Pago del servicio" paid={false} unpaidLabel="Por cuotas" note={task.notPayableReason} />
    );
  }

  return (
    <>
      <ExpensePaymentRow
        title="Pago del servicio"
        paid={task.isPaid}
        paidAt={task.paidAt}
        amount={task.paidAmount ?? cost}
        actionLabel={task.payable ? 'Registrar pago' : undefined}
        onAction={() => setOpen(true)}
        blockedReason={canWrite ? undefined : writeHint}
      />
      <PayExpenseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar pago"
        description={`${task.plan?.name ?? 'Tarea'} · costo ${formatCurrency(cost)}`}
        amount={{ initial: cost, max: cost, label: 'Importe pagado' }}
        notBefore={task.performedAt}
        notBeforeMessage="El pago no puede ser anterior a la fecha en que se hizo la tarea"
        pending={pay.isPending}
        onSubmit={({ cashBoxId, at, amount }) =>
          pay.mutate(
            { id: task.taskId, body: { cashBoxId, paidAt: at, ...(amount !== undefined ? { amount } : {}) } },
            {
              onSuccess: () => {
                notify.success('Pago registrado: la tarea quedó paga');
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
