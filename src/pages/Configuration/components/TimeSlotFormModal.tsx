import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { TimeSlot, UpdateTimeSlotBody } from '../../../services/api/types';
import { useCreateTimeSlot, useUpdateTimeSlot } from '../../../services/queries/timeSlots';
import { notify } from '../../../utils/notifications';
import { timeSlotSchema, type TimeSlotFormValues } from './timeSlotSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con franja, se edita; sin ella, es un alta. */
  slot?: TimeSlot | null;
}

const EMPTY: TimeSlotFormValues = { name: '', startTime: '', endTime: '', capacity: 50 };

const toDefaults = (slot?: TimeSlot | null): TimeSlotFormValues =>
  slot
    ? {
        name: slot.name,
        startTime: slot.startTime.slice(0, 5),
        endTime: slot.endTime.slice(0, 5),
        capacity: slot.capacity,
      }
    : EMPTY;

export const TimeSlotFormModal = ({ open, onClose, slot }: Props) => {
  const createTimeSlot = useCreateTimeSlot();
  const updateTimeSlot = useUpdateTimeSlot();
  const editing = Boolean(slot);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: toDefaults(slot),
  });

  useEffect(() => {
    if (open) reset(toDefaults(slot));
  }, [open, slot, reset]);

  const onSubmit = handleSubmit((values) => {
    const callbacks = (message: string) => ({
      onSuccess: () => {
        notify.success(message);
        onClose();
      },
      onError: notify.error,
    });
    if (slot) {
      // Sólo lo que cambió: la edición es parcial y no deja asientos de auditoría por lo que no se tocó.
      // (`capacity` viaja siempre: el tipo generado lo pide; con el mismo valor la API no cambia nada.)
      const before = toDefaults(slot);
      const body: UpdateTimeSlotBody = {
        capacity: values.capacity,
        ...(values.name !== before.name && { name: values.name }),
        ...(values.startTime !== before.startTime && { startTime: values.startTime }),
        ...(values.endTime !== before.endTime && { endTime: values.endTime }),
      };
      updateTimeSlot.mutate({ id: slot.time_slot_id, body }, callbacks('Franja actualizada'));
    } else createTimeSlot.mutate(values, callbacks('Franja creada'));
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar franja horaria' : 'Nueva franja horaria'}
      description={
        editing
          ? 'Los pedidos ya agendados en esta franja no cambian de horario.'
          : 'Los clientes podrán elegirla al agendar un pedido.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="time-slot-form" loading={createTimeSlot.isPending || updateTimeSlot.isPending}>
            {editing ? 'Guardar cambios' : 'Crear franja'}
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
