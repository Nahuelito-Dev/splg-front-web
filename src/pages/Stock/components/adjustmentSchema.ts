import { z } from 'zod';

const REASONS = ['count_correction', 'shrinkage', 'leak', 'damaged', 'lost', 'found'] as const;

/**
 * `CreateAdjustmentDto`: la cantidad se escribe sin signo (merma, fuga, rotura, pérdida y encontrado) y el signo lo
 * pone el motivo; sólo la corrección de conteo admite negativos. La nota explica por qué cambia el stock.
 */
export const adjustmentSchema = z
  .object({
    locationId: z.string().min(1, 'Elegí la ubicación'),
    reason: z.enum(REASONS, { message: 'Elegí el motivo' }),
    notes: z.string().trim().min(1, 'Explicá por qué cambia el stock').max(300, 'No puede tener más de 300 caracteres'),
    items: z
      .array(
        z.object({
          gasCylinderId: z.string().min(1, 'Elegí la garrafa'),
          condition: z.enum(['full', 'empty', 'defective']),
          amount: z.coerce
            .number({ invalid_type_error: 'Ingresá un número' })
            .int('Tiene que ser un número entero')
            .refine((n) => n !== 0, 'No puede ser 0')
            .refine((n) => Math.abs(n) <= 100000, 'Demasiado alto'),
        }),
      )
      .min(1, 'Agregá al menos una garrafa'),
  })
  .superRefine((values, ctx) => {
    if (values.reason === 'count_correction') return;
    values.items.forEach((item, index) => {
      if (item.amount < 0) {
        ctx.addIssue({ code: 'custom', path: ['items', index, 'amount'], message: 'Ingresá la cantidad sin signo' });
      }
    });
  });

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
