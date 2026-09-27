import { z } from 'zod';

/**
 * Reglas del formulario, las mismas que valida la API (`CreateGasCylinderDto`,
 * `PromocionDto`): se chequean antes de mandar el 400.
 */
const promotionSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .int('Tiene que ser un entero')
    .min(2, 'Arranca en 2 unidades'),
  discountPercentage: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .positive('Tiene que ser mayor que 0')
    .max(100, 'No puede superar el 100%'),
});

export const gasCylinderSchema = z.object({
  type: z.string().trim().min(1, 'Ingresá el tipo de garrafa').max(50, 'Máximo 50 caracteres'),
  weight: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).positive('Tiene que ser mayor que 0'),
  price: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).positive('Tiene que ser mayor que 0'),
  stock: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .int('Tiene que ser un entero')
    .min(0, 'No puede ser negativo'),
  description: z.string().trim().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  promotions: z.array(promotionSchema).refine(
    (promotions) => {
      const quantities = promotions.map((p) => p.quantity);
      return new Set(quantities).size === quantities.length;
    },
    { message: 'Hay dos promociones para la misma cantidad de unidades' },
  ),
});

export type GasCylinderFormValues = z.infer<typeof gasCylinderSchema>;
