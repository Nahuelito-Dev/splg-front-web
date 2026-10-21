import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
import type { TrafficFine } from '../../../services/api/types';
import { useCreateTrafficFine, useUpdateTrafficFine } from '../../../services/queries/fleetExpense';
import { notify } from '../../../utils/notifications';
import { fromLocalInput, toLocalInput } from '../fleetExpenseDates';
import { trafficFineSchema, type TrafficFineFormValues } from '../fleetExpenseSchemas';
import { useCarOptions } from './useCarOptions';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con multa es edición (CU-323); sin ella, alta (CU-198). */
  fine: TrafficFine | null;
  fixedCarId?: string;
}

const EMPTY: TrafficFineFormValues = {
  carId: '',
  occurredAt: '',
  jurisdiction: '',
  actNumber: '',
  infraction: '',
  amount: 0,
  voluntaryPaymentAmount: undefined,
  dueDate: '',
  employeeId: '',
};

/** Alta o edición de una multa. El responsable lo deduce el sistema del chofer que tenía el vehículo. */
export const TrafficFineFormModal = ({ open, onClose, fine, fixedCarId }: Props) => {
  const isEditing = Boolean(fine);
  const create = useCreateTrafficFine();
  const update = useUpdateTrafficFine();
  const { options: carOptions } = useCarOptions('Elegí un vehículo');
  const methods = useForm<TrafficFineFormValues>({ resolver: zodResolver(trafficFineSchema), defaultValues: EMPTY });
  const { reset } = methods;

  useEffect(() => {
    if (!open) return;
    reset(
      fine
        ? {
            carId: fine.carId,
            occurredAt: toLocalInput(fine.occurredAt),
            jurisdiction: fine.jurisdiction,
            actNumber: fine.actNumber,
            infraction: fine.infraction,
            amount: fine.amount,
            voluntaryPaymentAmount: fine.voluntaryPaymentAmount ?? undefined,
            dueDate: fine.dueDate ?? '',
            employeeId: '',
          }
        : { ...EMPTY, carId: fixedCarId ?? '', occurredAt: toLocalInput(new Date()) },
    );
  }, [open, fine, fixedCarId, reset]);

  const saving = create.isPending || update.isPending;

  const onSubmit = (values: TrafficFineFormValues) => {
    const occurredAt = fromLocalInput(values.occurredAt) ?? new Date().toISOString();
    const body = {
      occurredAt,
      jurisdiction: values.jurisdiction,
      actNumber: values.actNumber,
      infraction: values.infraction,
      amount: values.amount,
      voluntaryPaymentAmount: values.voluntaryPaymentAmount ?? null,
      dueDate: values.dueDate || null,
    };
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Multa actualizada' : 'Multa registrada');
        onClose();
      },
      onError: notify.error,
    };
    if (fine) update.mutate({ id: fine.fineId, body }, options);
    else create.mutate({ ...body, carId: values.carId }, options);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={saving}
      size="md"
      title={isEditing ? 'Editar multa' : 'Nueva multa de tránsito'}
      description={
        isEditing
          ? `Acta ${fine?.actNumber ?? ''}`
          : 'Nace pendiente. El responsable es el chofer que tenía el vehículo en uso en ese momento.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="traffic-fine-form" loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Registrar multa'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="traffic-fine-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormSelect
            name="carId"
            label="Vehículo"
            required
            options={carOptions}
            disabled={isEditing || Boolean(fixedCarId)}
          />
        </div>
        <FormInput name="occurredAt" label="Cuándo ocurrió" type="datetime-local" required />
        <FormInput name="dueDate" label="Vence el" type="date" />
        <FormInput
          name="jurisdiction"
          label="Jurisdicción"
          required
          maxLength={80}
          placeholder="Municipalidad de Posadas"
        />
        <FormInput name="actNumber" label="Número de acta" required maxLength={40} hint="Único en la jurisdicción." />
        <div className="sm:col-span-2">
          <FormInput name="infraction" label="Infracción" required maxLength={1000} />
        </div>
        <FormInput name="amount" label="Importe" type="number" step="0.01" min={0} required />
        <FormInput
          name="voluntaryPaymentAmount"
          label="Importe con pago voluntario"
          type="number"
          step="0.01"
          min={0}
        />
      </Form>
    </Modal>
  );
};
