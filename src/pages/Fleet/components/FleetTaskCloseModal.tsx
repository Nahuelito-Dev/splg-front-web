import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Modal, FormInput, FormTextArea, Form, Select } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import { useCloseFleetTask, useCloseFleetTaskAndPay } from '../../../services/queries/fleet';
import { useCashBoxOptions } from '../../../services/queries/finance';
import { daysAgo } from '../../../utils/dates';
import { notify } from '../../../utils/notifications';
import { CASH_BOX_KIND } from '../../../utils/statusLabels';
import { formatCurrency } from '../../../utils/format';
import { closePaymentErrors, fleetTaskCloseSchema, type FleetTaskCloseValues } from './fleetTaskSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  task: FleetTask | null;
}

/** CU-141: registrar que la póliza/VTV/licencia/service se hizo (o se renovó). */
export const FleetTaskCloseModal = ({ open, onClose, task }: Props) => {
  const closeTask = useCloseFleetTask();
  const closeAndPay = useCloseFleetTaskAndPay();
  const [payNow, setPayNow] = useState(false);
  const [cashBoxId, setCashBoxId] = useState('');
  const [boxError, setBoxError] = useState<string>();
  const cashBoxes = useCashBoxOptions({ enabled: open && payNow });
  const methods = useForm<FleetTaskCloseValues>({ resolver: zodResolver(fleetTaskCloseSchema) });
  const { reset, setError } = methods;

  useEffect(() => {
    if (!open) return;
    // La fecha local de hoy, no la de `toISOString()`: esa es la de UTC, un día adelantada
    // (o atrasada) según la hora y la zona horaria de quien lo usa.
    setPayNow(false);
    setCashBoxId('');
    setBoxError(undefined);
    reset({
      performedAt: daysAgo(0),
      odometerKm: undefined,
      cost: undefined,
      provider: task?.provider ?? '',
      notes: '',
    });
  }, [open, task, reset]);

  const onSubmit = (values: FleetTaskCloseValues) => {
    if (!task) return;
    const invalid = closePaymentErrors(payNow, values.cost ?? task.cost ?? undefined, cashBoxId);
    if (invalid) {
      if (invalid.cost) setError('cost', { message: invalid.cost });
      setBoxError(invalid.cashBoxId);
      return;
    }
    const callbacks = {
      onSuccess: () => {
        notify.success(payNow ? 'Tarea cerrada y paga' : 'Tarea cerrada: se registró como hecha');
        onClose();
      },
      onError: notify.error,
    };
    if (payNow) {
      closeAndPay.mutate({ id: task.taskId, body: { ...values, payment: { cashBoxId } } }, callbacks);
      return;
    }
    closeTask.mutate({ id: task.taskId, body: values }, callbacks);
  };
  const pending = closeTask.isPending || closeAndPay.isPending;
  const boxes = cashBoxes.data?.data ?? [];
  const isInsurance = task?.plan?.documentKind === 'insurance';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar tarea"
      description={task?.plan?.name ? `${task.plan.name}: se registra que se hizo o se renovó.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="fleet-task-close-form" loading={pending}>
            Cerrar tarea
          </Button>
        </>
      }
    >
      <Form methods={methods} id="fleet-task-close-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormInput name="performedAt" label="Se hizo el" type="date" required />
        <FormInput name="odometerKm" label="Kilometraje" type="number" min={0} step={1} />
        <FormInput name="cost" label="Costo" type="number" min={0} step="0.01" />
        <FormInput name="provider" label="Proveedor" placeholder="Si cambió respecto al de la tarea" maxLength={120} />
        <div className="sm:col-span-2">
          <FormTextArea name="notes" label="Notas" maxLength={2000} />
        </div>
        {isInsurance ? (
          <p className="text-sm text-muted sm:col-span-2">El seguro se paga por sus cuotas.</p>
        ) : (
          <div className="space-y-3 sm:col-span-2">
            <Checkbox
              label="Lo pagué ahora"
              hint="El costo sale de una caja de efectivo, banco o billetera, en el mismo acto."
              checked={payNow}
              onChange={(e) => {
                setPayNow(e.target.checked);
                setBoxError(undefined);
              }}
            />
            {payNow && (
              <Select
                label="Caja de la que sale el pago"
                required
                value={cashBoxId}
                onChange={(e) => {
                  setCashBoxId(e.target.value);
                  setBoxError(undefined);
                }}
                options={[
                  { value: '', label: 'Elegí una caja' },
                  ...boxes.map((b) => ({
                    value: b.cashBoxId,
                    label: `${b.name} · ${CASH_BOX_KIND[b.kind].text} · ${formatCurrency(b.balance)}`,
                  })),
                ]}
                hint="Si es de efectivo, tiene que tener la sesión abierta."
                error={boxError}
              />
            )}
          </div>
        )}
      </Form>
    </Modal>
  );
};
