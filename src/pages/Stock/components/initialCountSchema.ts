import { z } from 'zod';

const count = z.coerce
  .number({ invalid_type_error: 'Ingresá un número' })
  .int('Tiene que ser un número entero')
  .min(0, 'No puede ser negativo')
  .max(100000, 'Demasiado alto');

/** `CreateInitialCountDto`: lo que hay físicamente de cada tipo de garrafa en el galpón. */
export const initialCountSchema = z.object({
  notes: z.string().trim().max(300, 'No puede tener más de 300 caracteres'),
  items: z
    .array(z.object({ gasCylinderId: z.string(), type: z.string(), full: count, empty: count, defective: count }))
    .min(1, 'No hay garrafas en el catálogo'),
});

export type InitialCountFormValues = z.infer<typeof initialCountSchema>;
