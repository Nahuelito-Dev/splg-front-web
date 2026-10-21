import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, Form } from '../../../common/components/ui';
import type { VehicleAccident } from '../../../services/api/types';
import { useCloseVehicleAccident } from '../../../services/queries/fleetExpense';
import { notify } from '../../../utils/notifications';
import { closeAccidentSchema, type CloseAccidentFormValues } from '../fleetExpenseSchemas';

interface Props {
  accident: VehicleAccident | null;
  onClose: () => void;
}

/** Cerrar un siniestro (CU-202). No reactiva el vehículo: eso es «Reactivar» en su ficha. */
export const CloseAccidentModal = ({ accident, onClose }: Props) => {
  const close = useCloseVehicleAccident();
  const methods = useForm<CloseAccidentFormValues>({ resolver: zodResolver(closeAccidentSchema) });
  const { reset } = methods;

  useEffect(() => {
    if (accident) reset({ repairCost: 0, insurerReimbursement: 0, deductibleAmount: 0 });
  }, [accident, reset]);

  const onSubmit = (values: CloseAccidentFormValues) =>
    close.mutate(
      { id: accident?.accidentId ?? '', body: values },
      {
        onSuccess: () => {
          notify.success('Siniestro cerrado');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={accident !== null}
      onClose={onClose}
      closeBlocked={close.isPending}
      title="Cerrar el siniestro"
      description="El costo neto (reparación menos reintegro) entra en el costo del vehículo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={close.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="close-accident-form" loading={close.isPending}>
            Cerrar siniestro
          </Button>
        </>
      }
    >
      <Form methods={methods} id="close-accident-form" onSubmit={onSubmit} className="grid gap-4">
        <FormInput name="repairCost" label="Costo de la reparación" type="number" step="0.01" min={0} required />
        <FormInput
          name="insurerReimbursement"
          label="Reintegro del seguro"
          type="number"
          step="0.01"
          min={0}
          required
        />
        <FormInput name="deductibleAmount" label="Franquicia pagada" type="number" step="0.01" min={0} required />
      </Form>
    </Modal>
  );
};
