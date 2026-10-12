import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { Employee } from '../../../services/api/types';
import { useReinstateEmployee } from '../../../services/queries/employees';
import { notify } from '../../../utils/notifications';
import { reinstateSchema, type ReinstateFormValues } from '../employeeAccessSchemas';

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

/** Reincorporación de un legajo egresado (CU-181): fecha de ingreso nueva, opcional. No desbloquea la cuenta. */
export const ReinstateEmployeeModal = ({ open, onClose, employee }: Props) => {
  const reinstate = useReinstateEmployee();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReinstateFormValues>({ resolver: zodResolver(reinstateSchema), defaultValues: { hireDate: '' } });

  useEffect(() => {
    if (open) reset({ hireDate: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    if (reinstate.isPending) return;
    reinstate.mutate(
      { id: employee.employeeId, body: values.hireDate ? { hireDate: values.hireDate } : {} },
      {
        onSuccess: () => {
          notify.success('Legajo reincorporado');
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
      title="Reincorporar legajo"
      description={
        employee.hasAccount
          ? 'El legajo vuelve a estar activo. Su cuenta de acceso sigue bloqueada: se desbloquea aparte.'
          : 'El legajo vuelve a estar activo.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-reinstate" loading={reinstate.isPending}>
            Reincorporar
          </Button>
        </>
      }
    >
      <form id="employee-reinstate" onSubmit={(e) => void onSubmit(e)} noValidate>
        <Input
          label="Nueva fecha de ingreso (opcional)"
          type="date"
          hint="Si la dejás vacía, se usa hoy. No puede ser anterior al egreso."
          error={errors.hireDate?.message}
          {...register('hireDate')}
        />
      </form>
    </Modal>
  );
};
