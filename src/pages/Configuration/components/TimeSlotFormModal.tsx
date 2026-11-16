import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, Modal } from '../../../common/components/ui';
import type { TimeSlot, UpdateTimeSlotBody } from '../../../services/api/types';
import { useCreateTimeSlot, useTimeSlots, useUpdateTimeSlot } from '../../../services/queries/timeSlots';
import { notify } from '../../../utils/notifications';
import { findSlotConflict, MAX_SLOT_CAPACITY, timeSlotSchema, type TimeSlotFormValues } from './timeSlotSchema';

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
  const { data: slots, refetch: refetchSlots } = useTimeSlots();
  const editing = Boolean(slot);
  const methods = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: toDefaults(slot),
  });
  const { reset, setError } = methods;

  useEffect(() => {
    if (open) reset(toDefaults(slot));
  }, [open, slot, reset]);

  const onSubmit = async (values: TimeSlotFormValues) => {
    // Con las franjas de ahora, no con las de cuando se abrió el formulario; si no se pueden traer, decide el back.
    const fresh = (await refetchSlots()).data ?? slots ?? [];
    const conflict = findSlotConflict(values, fresh, slot?.time_slot_id);
    if (conflict) {
      setError(conflict.field, { message: conflict.message });
      return;
    }
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
  };

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
      <Form methods={methods} onSubmit={onSubmit} id="time-slot-form" className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput name="name" label="Nombre" required placeholder="Ej: Mañana" />
        </div>
        <FormInput name="startTime" label="Inicio" required type="time" />
        <FormInput name="endTime" label="Fin" required type="time" />
        <FormInput name="capacity" label="Cupo máximo" required type="number" min={1} max={MAX_SLOT_CAPACITY} />
      </Form>
    </Modal>
  );
};
