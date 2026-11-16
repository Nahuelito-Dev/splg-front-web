import { z } from 'zod';
import type { Leave } from '../../services/api/types';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const leaveFields = {
  type: z.enum([
    'vacation',
    'sick',
    'work_accident',
    'study',
    'marriage',
    'birth',
    'bereavement',
    'unpaid',
    'suspension',
    'unjustified_absence',
    'other',
  ]),
  startDate: z.string().regex(DAY, 'Ingresá la fecha de inicio'),
  endDate: z.string().regex(DAY, 'Ingresá la fecha de fin'),
  reason: z.string().trim().max(500, 'Hasta 500 caracteres'),
};

const endNotBeforeStart = (values: { startDate: string; endDate: string }) =>
  !DAY.test(values.startDate) || !DAY.test(values.endDate) || values.endDate >= values.startDate;
const END_ERROR = { message: 'El fin no puede ser anterior al inicio', path: ['endDate'] };

/** Alta y modificación de una licencia (CU-191, CU-316): las mismas reglas que el DTO del back. */
export const leaveSchema = z.object(leaveFields).refine(endNotBeforeStart, END_ERROR);

/** El formulario además lleva a quién corresponde la licencia. */
export const leaveFormSchema = z
  .object({ employeeId: z.string().min(1, 'Elegí al empleado'), ...leaveFields })
  .refine(endNotBeforeStart, END_ERROR);

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;

const ACTIVE: Leave['status'][] = ['requested', 'approved'];

/** Los días corridos del período, con ambos extremos (lo mismo que calcula el back). */
export const leaveDays = (startDate: string, endDate: string): number | null => {
  if (!DAY.test(startDate) || !DAY.test(endDate) || endDate < startDate) return null;
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1;
};

/**
 * La licencia solicitada o aprobada del mismo empleado que se pisa con el período (extremos incluidos), sin contar la
 * que se está modificando. Es el aviso previo a confirmar: la decisión final es del back.
 */
export const overlappingLeave = (
  leaves: Pick<Leave, 'leaveId' | 'status' | 'startDate' | 'endDate'>[],
  startDate: string,
  endDate: string,
  ignoreId?: string,
): Pick<Leave, 'leaveId' | 'status' | 'startDate' | 'endDate'> | null => {
  if (leaveDays(startDate, endDate) === null) return null;
  return (
    leaves.find(
      (leave) =>
        leave.leaveId !== ignoreId &&
        ACTIVE.includes(leave.status) &&
        leave.startDate <= endDate &&
        leave.endDate >= startDate,
    ) ?? null
  );
};

/** Qué se puede hacer con una licencia según su estado (la máquina de estados del back). */
export const leaveActions = (leave: Pick<Leave, 'status' | 'endDate'>, today: string) => {
  const requested = leave.status === 'requested';
  const approved = leave.status === 'approved';
  return {
    approve: requested,
    reject: requested,
    edit: requested,
    // Se cancela mientras no terminó: una solicitada o aprobada cuyo último día no pasó.
    cancel: (requested || approved) && leave.endDate >= today,
  };
};
