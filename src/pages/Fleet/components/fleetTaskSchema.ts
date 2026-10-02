import { z } from 'zod';

/** Un número opcional: en el formulario el campo puede quedar vacío. */
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => (value === '' || value === undefined ? undefined : value), schema.optional());

/** `dueKm`/`odometerKm`: la API los valida con `@IsInt()` (kilometraje, no tiene sentido con decimales). */
const optionalInt = () =>
  optionalNumber(z.coerce.number().int('Tiene que ser un número entero').nonnegative('No puede ser negativo'));

/** Un texto opcional con el mismo límite que su `@MaxLength` en el DTO del back. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede tener más de ${max} caracteres`)
    .optional()
    .transform((value) => value || undefined);

/** Lo que se edita de una tarea abierta (`UpdateFleetTaskDto`): nunca el plan ni a quién pertenece. */
export const fleetTaskDetailsSchema = z.object({
  dueAt: z.string().optional(),
  dueKm: optionalInt(),
  provider: optionalText(120),
  referenceNumber: optionalText(60),
  category: optionalText(10),
  notes: optionalText(2000),
  scheduledAt: z.string().optional(),
});

/** El alta (`CreateFleetTaskDto`): además del plan, necesita un vencimiento (fecha o km). */
export const fleetTaskCreateSchema = fleetTaskDetailsSchema
  .extend({ planId: z.string().trim().min(1, 'Elegí un plan') })
  .refine((values) => Boolean(values.dueAt) || values.dueKm !== undefined, {
    message: 'Ingresá una fecha límite o un kilometraje',
    path: ['dueAt'],
  });

export type FleetTaskCreateValues = z.infer<typeof fleetTaskCreateSchema>;

/** Cómo cerrar una tarea (`CloseFleetTaskDto`, CU-141): cuándo se hizo es obligatorio. */
export const fleetTaskCloseSchema = z.object({
  performedAt: z.string().trim().min(1, 'Ingresá cuándo se hizo'),
  odometerKm: optionalInt(),
  cost: optionalNumber(z.coerce.number().nonnegative('No puede ser negativo')),
  provider: optionalText(120),
  notes: optionalText(2000),
});

export type FleetTaskCloseValues = z.infer<typeof fleetTaskCloseSchema>;
