import { z } from 'zod';
import type { RouteSheet } from '../../services/api/types';

/** Las mismas reglas que `AddRouteSheetStopDto` / `MoveRouteSheetStopDto`: hoja de destino, posición desde 1. */
export const buildStopTargetSchema = (sheets: RouteSheet[]) =>
  z
    .object({
      targetSheetId: z.string().min(1, 'Elegí la hoja'),
      position: z.string().trim(),
      acceptLateStops: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.position === '') return;
      const target = sheets.find((s) => s.id === values.targetSheetId);
      const max = (target?.stops.length ?? 0) + 1;
      const position = Number(values.position);
      if (!Number.isInteger(position) || position < 1 || position > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['position'], message: `Un número entre 1 y ${max}` });
      }
    });

export type StopTargetValues = z.infer<ReturnType<typeof buildStopTargetSchema>>;

const optionalId = z.union([z.literal(''), z.string().uuid('Elegí una opción de la lista')]);

/** Las reglas de `CreateRouteSheetDto` / `UpdateRouteSheetDto`: ids de la lista y la salida como hora válida. */
export const sheetFormSchema = z.object({
  deliveryId: optionalId,
  carId: optionalId,
  originWarehouseId: optionalId,
  startTime: z.union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Una hora válida (HH:MM)')]),
});

export type SheetFormValues = z.infer<typeof sheetFormSchema>;

/** Las reglas de `FailedStopDto`: motivo de la lista; la nota, obligatoria con «Otro» y, si se escribe, de 3 a 280. */
export const failedStopSchema = z
  .object({
    reason: z.enum(['customer_absent', 'rejected', 'wrong_address', 'no_access', 'other'], {
      errorMap: () => ({ message: 'Elegí el motivo' }),
    }),
    note: z.string().trim().max(280, 'Hasta 280 caracteres'),
  })
  .superRefine((values, ctx) => {
    if (values.reason === 'other' && values.note === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'Contá qué pasó' });
    } else if (values.note !== '' && values.note.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'Al menos 3 caracteres' });
    }
  });

export type FailedStopValues = z.input<typeof failedStopSchema>;

/** La regla de `CloseRouteSheetDto`: el motivo, de 5 a 280 caracteres. */
export const closeSheetReasonSchema = z
  .string()
  .trim()
  .min(5, 'Al menos 5 caracteres')
  .max(280, 'Hasta 280 caracteres');

/** El primer error del motivo de cierre, o nada si cumple (para el `ReasonModal`). */
export const closeSheetReasonError = (reason: string): string | undefined => {
  const result = closeSheetReasonSchema.safeParse(reason);
  return result.success ? undefined : result.error.issues[0]?.message;
};

/** Agregar un pedido a la hoja en curso: un pedido de la lista y, si se elige, la posición entre lo que falta. */
export const buildLiveStopSchema = (maxPosition: number) =>
  z
    .object({
      orderId: z.string().uuid('Elegí un pedido de la lista'),
      position: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (values.position === '') return;
      const position = Number(values.position);
      if (!Number.isInteger(position) || position < 1 || position > maxPosition) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['position'],
          message: `Un número entre 1 y ${maxPosition}`,
        });
      }
    });

export type LiveStopValues = z.infer<ReturnType<typeof buildLiveStopSchema>>;

/** Cambiar la fecha de un pedido que espera al admin: un día válido, de hoy en adelante (la regla de `UpdateOrderDto`). */
export const buildRescheduleSchema = (today: string) =>
  z.object({
    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí el día')
      .refine((value) => value >= today, 'No puede ser un día pasado'),
  });

export type RescheduleValues = z.infer<ReturnType<typeof buildRescheduleSchema>>;

/** Las reglas de `CreateRoutePlanningHolidayDto`: el día (no pasado) y una descripción de 2 a 120 caracteres. */
export const buildHolidaySchema = (today: string) =>
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí el día')
      .refine((value) => value >= today, 'No puede ser un día pasado'),
    description: z.string().trim().min(2, 'Al menos 2 caracteres').max(120, 'Hasta 120 caracteres'),
  });

export type HolidayValues = z.infer<ReturnType<typeof buildHolidaySchema>>;

/** El motivo de la cancelación (`CancelOrderDto`): obligatorio para el admin y hasta 500 caracteres. */
export const cancelReasonError = (reason: string): string | undefined =>
  reason.trim().length > 500 ? 'Hasta 500 caracteres' : undefined;
