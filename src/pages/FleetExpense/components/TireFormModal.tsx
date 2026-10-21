import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, Form } from '../../../common/components/ui';
import { useCreateTire } from '../../../services/queries/fleetExpense';
import { notify } from '../../../utils/notifications';
import { tireSchema, type TireFormValues } from '../fleetExpenseSchemas';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Registrar un neumático nuevo (CU-205): nace en depósito, sin vehículo ni posición. */
export const TireFormModal = ({ open, onClose }: Props) => {
  const create = useCreateTire();
  const methods = useForm<TireFormValues>({ resolver: zodResolver(tireSchema) });
  const { reset } = methods;

  useEffect(() => {
    if (open) reset({ serialNumber: '', brand: '', size: '', cost: 0 });
  }, [open, reset]);

  const onSubmit = (values: TireFormValues) =>
    create.mutate(values, {
      onSuccess: () => {
        notify.success('Neumático registrado');
        onClose();
      },
      onError: notify.error,
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending}
      title="Nuevo neumático"
      description="Se registra en depósito; se monta en un vehículo con un movimiento."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="tire-form" loading={create.isPending}>
            Registrar neumático
          </Button>
        </>
      }
    >
      <Form methods={methods} id="tire-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput
            name="serialNumber"
            label="Número de serie"
            required
            maxLength={60}
            hint="Único en la distribuidora."
          />
        </div>
        <FormInput name="brand" label="Marca" required maxLength={60} />
        <FormInput name="size" label="Medida" required maxLength={40} placeholder="215/75 R17.5" />
        <FormInput name="cost" label="Costo" type="number" step="0.01" min={0} required />
      </Form>
    </Modal>
  );
};
