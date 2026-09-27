import { z } from 'zod';

/**
 * Reglas del formulario de "Registrar incidencia". El `orderId` no está acá:
 * sale siempre del pedido elegido en `OrderPicker` (ver `CreateIncidentModal`).
 */
export const createIncidentSchema = z.object({
  type: z.enum(['damaged', 'out_of_stock', 'no_show', 'other']),
  description: z.string().trim().min(1, 'Describí lo que pasó'),
  photoUrl: z.union([z.literal(''), z.string().trim().url('Tiene que ser una URL válida')]),
});

export type CreateIncidentFormValues = z.infer<typeof createIncidentSchema>;
