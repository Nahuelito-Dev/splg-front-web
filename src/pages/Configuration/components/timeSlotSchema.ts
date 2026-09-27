import { z } from 'zod';

/** Reglas del formulario, las mismas que valida `CreateTimeSlotDto`. */
const HHMM = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const timeSlotSchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresá un nombre'),
    startTime: z.string().regex(HHMM, 'Formato HH:MM'),
    endTime: z.string().regex(HHMM, 'Formato HH:MM'),
    capacity: z.coerce
      .number({ invalid_type_error: 'Ingresá un número' })
      .int('Tiene que ser un entero')
      .positive('Tiene que ser mayor que 0'),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'El fin tiene que ser después del inicio',
    path: ['endTime'],
  });

export type TimeSlotFormValues = z.infer<typeof timeSlotSchema>;
