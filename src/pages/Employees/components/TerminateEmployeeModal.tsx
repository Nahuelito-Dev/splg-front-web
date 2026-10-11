import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import type { Employee } from '../../../services/api/types';
import { useTerminateEmployee } from '../../../services/queries/employees';
import { notify } from '../../../utils/notifications';
import { TERMINATION_REASON_LABELS } from '../employeeLabels';

const schema = z.object({
  terminationDate: z.string().min(1, 'Ingresá la fecha de egreso'),
  reason: z.enum(['resignation', 'dismissal', 'end_of_contract', 'retirement', 'other']),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

/** Egreso del legajo (CU-181): fecha y motivo. Bloquea la cuenta, deshabilita al chofer y libera su vehículo. */
export const TerminateEmployeeModal = ({ open, onClose, employee }: Props) => {
  const terminate = useTerminateEmployee();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { terminationDate: '', reason: 'resignation' } });

  useEffect(() => {
    if (open) reset({ terminationDate: '', reason: 'resignation' });
  }, [open, reset]);

  const onSubmit = handleSubmit((body) => {
    if (terminate.isPending) return;
    terminate.mutate(
      { id: employee.employeeId, body },
      {
        onSuccess: () => {
          notify.success('Egreso registrado');
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
      title="Registrar egreso"
      description={
        employee.hasAccount
          ? 'Se bloquea su cuenta de acceso y, si es chofer, se lo deshabilita y se libera su vehículo.'
          : 'El legajo queda como egresado.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-terminate" variant="danger" loading={terminate.isPending}>
            Registrar egreso
          </Button>
        </>
      }
    >
      <form id="employee-terminate" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label="Fecha de egreso"
          required
          type="date"
          error={errors.terminationDate?.message}
          {...register('terminationDate')}
        />
        <Select
          label="Motivo"
          required
          options={Object.entries(TERMINATION_REASON_LABELS).map(([value, label]) => ({ value, label }))}
          {...register('reason')}
        />
      </form>
    </Modal>
  );
};
