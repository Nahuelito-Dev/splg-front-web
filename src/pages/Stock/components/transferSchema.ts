import { z } from 'zod';

/**
 * `CreateTransferDto`. Dos modos: entre galpones, o camión -> galpón para regularizar lo que un camión sin carga abierta
 * tiene suelto (con nota obligatoria). Galpón -> camión no existe: el camión se carga desde la carga del día.
 */
export const transferSchema = z
  .object({
    mode: z.enum(['warehouses', 'truck']),
    fromWarehouseId: z.string(),
    carId: z.string(),
    toWarehouseId: z.string().min(1, 'Elegí el galpón de destino'),
    notes: z.string().trim().max(300, 'No puede tener más de 300 caracteres'),
    items: z
      .array(
        z.object({
          gasCylinderId: z.string().min(1, 'Elegí la garrafa'),
          condition: z.enum(['full', 'empty', 'defective']),
          quantity: z.coerce
            .number({ invalid_type_error: 'Ingresá un número' })
            .int('Tiene que ser un número entero')
            .min(1, 'Tiene que ser mayor a 0')
            .max(100000, 'Demasiado alto'),
        }),
      )
      .min(1, 'Agregá al menos una garrafa'),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'warehouses') {
      if (!values.fromWarehouseId)
        ctx.addIssue({ code: 'custom', path: ['fromWarehouseId'], message: 'Elegí el galpón de origen' });
      else if (values.fromWarehouseId === values.toWarehouseId) {
        ctx.addIssue({ code: 'custom', path: ['toWarehouseId'], message: 'El destino tiene que ser otro galpón' });
      }
      return;
    }
    if (!values.carId) ctx.addIssue({ code: 'custom', path: ['carId'], message: 'Elegí el camión' });
    if (!values.notes) ctx.addIssue({ code: 'custom', path: ['notes'], message: 'Explicá por qué se regulariza' });
  });

export type TransferFormValues = z.infer<typeof transferSchema>;
