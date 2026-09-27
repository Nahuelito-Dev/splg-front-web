import { z } from 'zod';

/**
 * Reglas del formulario de "Cargar reclamo". El `orderId`/`customerId` no
 * están acá: salen siempre del pedido elegido en `OrderPicker`, nunca se
 * escriben a mano (ver `CreateClaimModal`).
 */
export const createClaimSchema = z.object({
  reason: z.string().trim().min(1, 'Contá el motivo del reclamo'),
  description: z.string().trim().min(1, 'Describí el reclamo'),
  photoUrl: z.union([z.literal(''), z.string().trim().url('Tiene que ser una URL válida')]),
});

export type CreateClaimFormValues = z.infer<typeof createClaimSchema>;
