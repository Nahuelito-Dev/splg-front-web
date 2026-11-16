import { z } from 'zod';

/** Reglas del formulario, las mismas que valida `CreateTimeSlotDto`. */
const HHMM = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/** Tope de pedidos por franja y día (`CAPACIDAD_MAXIMA_FRANJA` del back). */
export const MAX_SLOT_CAPACITY = 10000;

export const timeSlotSchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresá un nombre').max(50, 'Máximo 50 caracteres'),
    startTime: z.string().regex(HHMM, 'Formato HH:MM'),
    endTime: z.string().regex(HHMM, 'Formato HH:MM'),
    capacity: z.coerce
      .number({ invalid_type_error: 'Ingresá un número' })
      .int('Tiene que ser un entero')
      .min(1, 'Tiene que ser mayor que 0')
      .max(MAX_SLOT_CAPACITY, `Máximo ${MAX_SLOT_CAPACITY} pedidos por franja`),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'El fin tiene que ser después del inicio',
    path: ['endTime'],
  });

export type TimeSlotFormValues = z.infer<typeof timeSlotSchema>;

interface SlotLike {
  time_slot_id: string;
  name: string;
  startTime: string;
  endTime: string;
}

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Lo que el back responde con 409: entre las franjas activas no se repite el nombre ni se pisa el horario.
 * Devuelve el campo y el mensaje, o `null` si no hay choque. `editingId` deja afuera a la franja que se edita.
 */
export const findSlotConflict = (
  values: Pick<TimeSlotFormValues, 'name' | 'startTime' | 'endTime'>,
  others: readonly SlotLike[],
  editingId?: string,
): { field: 'name' | 'startTime'; message: string } | null => {
  const rest = others.filter((slot) => slot.time_slot_id !== editingId);
  const sameName = rest.find((slot) => slot.name.trim().toLowerCase() === values.name.trim().toLowerCase());
  if (sameName) return { field: 'name', message: `Ya existe una franja activa con el nombre «${sameName.name}»` };
  const clash = rest.find(
    (slot) =>
      toMinutes(values.startTime) < toMinutes(slot.endTime) && toMinutes(slot.startTime) < toMinutes(values.endTime),
  );
  if (clash) {
    return {
      field: 'startTime',
      message: `La franja se solapa con «${clash.name}» (${clash.startTime.slice(0, 5)} a ${clash.endTime.slice(0, 5)}): ajustá el horario o desactivá esa franja`,
    };
  }
  return null;
};
