import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, TextArea } from '../../../common/components/ui';
import type { Attendance } from '../../../services/api/types';
import { useCorrectAttendance } from '../../../services/queries/personnel';
import { notify } from '../../../utils/notifications';
import { attendanceCorrectSchema, isoToLocal, localToIso, type AttendanceCorrectValues } from '../attendanceRules';

interface Props {
  open: boolean;
  onClose: () => void;
  attendance: Attendance | null;
}

/** Corrección del ingreso o del egreso de una jornada (CU-313). La nota que explica el cambio es obligatoria. */
export const AttendanceCorrectModal = ({ open, onClose, attendance }: Props) => {
  const correct = useCorrectAttendance();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AttendanceCorrectValues>({ resolver: zodResolver(attendanceCorrectSchema) });

  useEffect(() => {
    if (open && attendance) {
      reset({ checkInAt: isoToLocal(attendance.checkInAt), checkOutAt: isoToLocal(attendance.checkOutAt), notes: '' });
    }
  }, [open, attendance, reset]);

  const onSubmit = handleSubmit((values) => {
    if (!attendance || correct.isPending) return;
    correct.mutate(
      {
        id: attendance.attendanceId,
        body: {
          checkInAt: localToIso(values.checkInAt),
          checkOutAt: localToIso(values.checkOutAt),
          notes: values.notes,
        },
      },
      {
        onSuccess: () => {
          notify.success('Jornada corregida');
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
      closeBlocked={correct.isPending}
      title="Corregir jornada"
      description={attendance ? `${attendance.employeeName} · deja constancia de por qué cambia.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={correct.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="attendance-correct" loading={correct.isPending}>
            Guardar corrección
          </Button>
        </>
      }
    >
      <form id="attendance-correct" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label="Ingreso"
          required
          type="datetime-local"
          error={errors.checkInAt?.message}
          {...register('checkInAt')}
        />
        <Input label="Egreso" type="datetime-local" error={errors.checkOutAt?.message} {...register('checkOutAt')} />
        <div className="sm:col-span-2">
          <TextArea
            label="Nota"
            required
            maxLength={500}
            placeholder="Olvidó marcar la salida"
            error={errors.notes?.message}
            {...register('notes')}
          />
        </div>
      </form>
    </Modal>
  );
};
