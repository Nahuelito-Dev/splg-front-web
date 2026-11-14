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
