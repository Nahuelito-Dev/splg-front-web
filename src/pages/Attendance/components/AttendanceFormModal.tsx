import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import { useEmployees } from '../../../services/queries/employees';
import { useRegisterAttendance } from '../../../services/queries/personnel';
import { notify } from '../../../utils/notifications';
import { employeeFullName } from '../../Employees/employeeLabels';
import { attendanceRegisterSchema, isoToLocal, localToIso, type AttendanceRegisterValues } from '../attendanceRules';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Desde la ficha del empleado ya se sabe a quién; desde la grilla se elige. */
  employeeId?: string;
}

const EMPLOYEES = { page: 0, pageSize: 100 };

/** Carga manual de una jornada (CU-189): ingreso y, si ya terminó, egreso. Hay una sola jornada abierta por empleado. */
export const AttendanceFormModal = ({ open, onClose, employeeId }: Props) => {
  const register_ = useRegisterAttendance();
  const employees = useEmployees(EMPLOYEES, { status: 'active' }, open && !employeeId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AttendanceRegisterValues>({ resolver: zodResolver(attendanceRegisterSchema) });

  useEffect(() => {
    if (open) reset({ employeeId: employeeId ?? '', checkInAt: isoToLocal(new Date().toISOString()), checkOutAt: '' });
  }, [open, employeeId, reset]);

  const onSubmit = handleSubmit((values) => {
    if (register_.isPending) return;
    const checkInAt = localToIso(values.checkInAt);
    if (!checkInAt) return;
    register_.mutate(
      { employeeId: values.employeeId, body: { checkInAt, checkOutAt: localToIso(values.checkOutAt) } },
      {
        onSuccess: () => {
          notify.success('Asistencia registrada');
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
      closeBlocked={register_.isPending}
      title="Registrar asistencia"
      description="Sin egreso la jornada queda abierta. Cada empleado puede tener una sola jornada abierta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={register_.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="attendance-form" loading={register_.isPending}>
            Registrar
          </Button>
        </>
      }
    >
      <form id="attendance-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!employeeId && (
          <div className="sm:col-span-2">
            <Select
              label="Empleado"
              required
              options={[
                { value: '', label: employees.isPending ? 'Cargando…' : 'Elegí un empleado' },
                ...(employees.data?.rows ?? []).map((e) => ({
                  value: e.employeeId,
                  label: `${employeeFullName(e)} · legajo ${e.fileNumber}`,
                })),
              ]}
              error={errors.employeeId?.message}
              {...register('employeeId')}
            />
          </div>
        )}
        <Input
          label="Ingreso"
          required
          type="datetime-local"
          error={errors.checkInAt?.message}
          {...register('checkInAt')}
        />
        <Input label="Egreso" type="datetime-local" error={errors.checkOutAt?.message} {...register('checkOutAt')} />
      </form>
    </Modal>
  );
};
