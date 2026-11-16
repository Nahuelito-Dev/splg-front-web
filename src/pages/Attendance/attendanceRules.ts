import { z } from 'zod';
import { isFutureMoment } from '../../utils/dates';

/** El valor de un `<input type="datetime-local">` (hora local, sin zona) a un instante ISO. Vacío, `undefined`. */
export const localToIso = (value: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Un instante ISO al valor de un `<input type="datetime-local">` en la hora local del navegador. */
export const isoToLocal = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** El día de hoy (`YYYY-MM-DD`) en la hora local del navegador. */
export const todayLocal = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** El egreso, si se indica, tiene que ser posterior al ingreso (lo mismo que exige el back). */
const egressAfterIngress = (values: { checkInAt: string; checkOutAt: string }): boolean => {
  const out = localToIso(values.checkOutAt);
  const into = localToIso(values.checkInAt);
  return !out || !into || out > into;
};

/** El back no deja registrar ni corregir una jornada hacia el futuro (tolera un minuto de reloj). */
const notFuture = (value: string): boolean => {
  const iso = localToIso(value);
  return !iso || !isFutureMoment(iso);
};

const EGRESS_ERROR = { message: 'El egreso tiene que ser posterior al ingreso', path: ['checkOutAt'] };

/** Carga manual de una jornada (CU-189). */
export const attendanceRegisterSchema = z
  .object({
    employeeId: z.string().min(1, 'Elegí al empleado'),
    checkInAt: z.string().min(1, 'Ingresá el ingreso').refine(notFuture, 'El ingreso no puede ser futuro'),
    checkOutAt: z.string().refine(notFuture, 'El egreso no puede ser futuro'),
  })
  .refine(egressAfterIngress, EGRESS_ERROR);

/** Corrección de una jornada (CU-313): la nota que explica el cambio es obligatoria. */
export const attendanceCorrectSchema = z
  .object({
    checkInAt: z.string().min(1, 'Ingresá el ingreso').refine(notFuture, 'El ingreso no puede ser futuro'),
    checkOutAt: z.string().refine(notFuture, 'El egreso no puede ser futuro'),
    notes: z.string().trim().min(1, 'Explicá el cambio en una nota').max(500, 'Hasta 500 caracteres'),
  })
  .refine(egressAfterIngress, EGRESS_ERROR);

export type AttendanceRegisterValues = z.infer<typeof attendanceRegisterSchema>;
export type AttendanceCorrectValues = z.infer<typeof attendanceCorrectSchema>;

/** «8 h 30 min», «45 min»; `null` mientras la jornada está abierta. */
export const durationText = (minutes: number | null): string | null => {
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};
