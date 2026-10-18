import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import type { Leave } from '../../../services/api/types';
import { useEmployees } from '../../../services/queries/employees';
import { useCreateLeave, useLeaves, useUpdateLeave } from '../../../services/queries/personnel';
import { formatDay } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { LEAVE_STATUS, LEAVE_TYPE, labelOf } from '../../../utils/statusLabels';
import { employeeFullName } from '../../Employees/employeeLabels';
import { leaveDays, leaveFormSchema, overlappingLeave, type LeaveFormValues } from '../leaveRules';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Desde la ficha del empleado ya se sabe a quién; desde la bandeja se elige. */
  employeeId?: string;
  /** Con licencia es la modificación (sólo una solicitada); sin ella, el alta. */
  leave: Leave | null;
}

const EMPLOYEES = { page: 0, pageSize: 100 };
const ALL_OF_AN_EMPLOYEE = { page: 0, pageSize: 100 };

/**
 * Alta o modificación de una licencia (CU-191, CU-316). Antes de confirmar avisa si el período se superpone con otra
 * licencia solicitada o aprobada del empleado: la API lo rechaza igual (409), pero se ve antes.
 */
export const LeaveFormModal = ({ open, onClose, employeeId, leave }: Props) => {
  const isEditing = Boolean(leave);
  const createLeave = useCreateLeave();
  const updateLeave = useUpdateLeave();
  const saving = createLeave.isPending || updateLeave.isPending;
  const employees = useEmployees(EMPLOYEES, { status: 'active' }, open && !employeeId && !isEditing);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LeaveFormValues>({ resolver: zodResolver(leaveFormSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      employeeId: leave?.employeeId ?? employeeId ?? '',
      type: leave?.type ?? 'vacation',
      startDate: leave?.startDate ?? '',
      endDate: leave?.endDate ?? '',
      reason: leave?.reason ?? '',
    });
  }, [open, leave, employeeId, reset]);

  const selectedEmployee = watch('employeeId');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const days = leaveDays(startDate, endDate);
  const theirs = useLeaves(
    ALL_OF_AN_EMPLOYEE,
    { employeeId: selectedEmployee, from: startDate, to: endDate },
    open && Boolean(selectedEmployee) && days !== null,
  );
  const overlap = days === null ? null : overlappingLeave(theirs.data?.rows ?? [], startDate, endDate, leave?.leaveId);

  const onSubmit = handleSubmit((values) => {
    if (saving || overlap) return;
    const body = {
      type: values.type,
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason || undefined,
    };
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Licencia modificada' : 'Licencia registrada');
        onClose();
      },
      onError: notify.error,
    };
    if (leave) updateLeave.mutate({ id: leave.leaveId, body }, options);
    else createLeave.mutate({ employeeId: values.employeeId, body }, options);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={saving}
      title={isEditing ? 'Modificar licencia' : 'Registrar licencia'}
      description={
        isEditing
          ? `${leave?.employeeName ?? ''} · sólo se modifica mientras está solicitada.`
          : 'Nace solicitada: se aprueba o se rechaza desde la bandeja de licencias.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="leave-form"
            loading={saving}
            blockedReason={overlap ? 'El período se superpone con otra licencia' : undefined}
          >
            {isEditing ? 'Guardar cambios' : 'Registrar licencia'}
          </Button>
        </>
      }
    >
      <form id="leave-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!employeeId && !isEditing && (
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
        <div className="sm:col-span-2">
          <Select
            label="Tipo"
            required
            options={Object.entries(LEAVE_TYPE).map(([value, label]) => ({ value, label }))}
            error={errors.type?.message}
            {...register('type')}
          />
        </div>
        <Input label="Desde" required type="date" error={errors.startDate?.message} {...register('startDate')} />
        <Input
          label="Hasta"
          required
          type="date"
          hint={days !== null ? `${days} ${days === 1 ? 'día corrido' : 'días corridos'}` : undefined}
          error={errors.endDate?.message}
          {...register('endDate')}
        />
        {overlap && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger sm:col-span-2"
          >
            Se superpone con una licencia {labelOf(LEAVE_STATUS, overlap.status).text.toLowerCase()} del{' '}
            {formatDay(overlap.startDate)} al {formatDay(overlap.endDate)}. Cancelala o elegí otro período.
          </p>
        )}
        <div className="sm:col-span-2">
          <TextArea label="Motivo" maxLength={500} error={errors.reason?.message} {...register('reason')} />
        </div>
      </form>
    </Modal>
  );
};
