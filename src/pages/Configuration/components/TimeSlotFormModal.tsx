import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal } from '../../../common/components/ui';
import { useCreateTimeSlot } from '../../../services/queries/timeSlots';
import { notify } from '../../../utils/notifications';
import { timeSlotSchema, type TimeSlotFormValues } from './timeSlotSchema';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const TimeSlotFormModal = ({ open, onClose }: Props) => {
  const createTimeSlot = useCreateTimeSlot();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: { name: '', startTime: '', endTime: '', capacity: 50 },
  });

  useEffect(() => {
    if (open) reset({ name: '', startTime: '', endTime: '', capacity: 50 });
  }, [open, reset]);

  const onSubmit = handleSubmit((values) =>
    createTimeSlot.mutate(values, {
      onSuccess: () => {
        notify.success('Franja creada');
        onClose();
      },
      onError: notify.error,
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva franja horaria"
      description="Los clientes podrán elegirla al agendar un pedido."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="time-slot-form" loading={createTimeSlot.isPending}>
            Crear franja
          </Button>
        </>
      }
    >
      <form id="time-slot-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Input label="Nombre" required placeholder="Ej: Mañana" error={errors.name?.message} {...register('name')} />
        </div>
        <Input label="Inicio" required type="time" error={errors.startTime?.message} {...register('startTime')} />
        <Input label="Fin" required type="time" error={errors.endTime?.message} {...register('endTime')} />
        <Input
          label="Cupo máximo"
          required
          type="number"
          min={1}
          error={errors.capacity?.message}
          {...register('capacity')}
        />
      </form>
    </Modal>
  );
};
