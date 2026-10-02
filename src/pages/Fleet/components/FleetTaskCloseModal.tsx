import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, TextArea } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import { useCloseFleetTask } from '../../../services/queries/fleet';
import { daysAgo } from '../../../utils/dates';
import { notify } from '../../../utils/notifications';
import { fleetTaskCloseSchema, type FleetTaskCloseValues } from './fleetTaskSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  task: FleetTask | null;
}

/** CU-141: registrar que la póliza/VTV/licencia/service se hizo (o se renovó). */
export const FleetTaskCloseModal = ({ open, onClose, task }: Props) => {
  const closeTask = useCloseFleetTask();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FleetTaskCloseValues>({ resolver: zodResolver(fleetTaskCloseSchema) });

  useEffect(() => {
    if (!open) return;
    // La fecha local de hoy, no la de `toISOString()`: esa es la de UTC, un día adelantada
    // (o atrasada) según la hora y la zona horaria de quien lo usa.
    reset({
      performedAt: daysAgo(0),
      odometerKm: undefined,
      cost: undefined,
      provider: task?.provider ?? '',
      notes: '',
    });
  }, [open, task, reset]);

  const onSubmit = handleSubmit((values) => {
    if (!task) return;
    closeTask.mutate(
      { id: task.taskId, body: values },
      {
        onSuccess: () => {
          notify.success('Tarea cerrada: se registró como hecha');
          onClose();
        },
        onError: notify.error,
      },
    );
  });

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
          <Button type="submit" form="fleet-task-close-form" loading={closeTask.isPending}>
            Cerrar tarea
          </Button>
        </>
      }
    >
      <form
        id="fleet-task-close-form"
        onSubmit={(e) => void onSubmit(e)}
        className="grid gap-4 sm:grid-cols-2"
        noValidate
      >
        <Input
          label="Se hizo el"
          type="date"
          required
          error={errors.performedAt?.message}
          {...register('performedAt')}
        />
        <Input
          label="Kilometraje"
          type="number"
          min={0}
          step={1}
          error={errors.odometerKm?.message}
          {...register('odometerKm')}
        />
        <Input label="Costo" type="number" min={0} step="0.01" error={errors.cost?.message} {...register('cost')} />
        <Input
          label="Proveedor"
          placeholder="Si cambió respecto al de la tarea"
          maxLength={120}
          error={errors.provider?.message}
          {...register('provider')}
        />
        <div className="sm:col-span-2">
          <TextArea label="Notas" maxLength={2000} error={errors.notes?.message} {...register('notes')} />
        </div>
      </form>
    </Modal>
  );
};
