import { z } from 'zod';

/**
 * Reglas del formulario, las mismas que valida la API (`CreateGasCylinderDto`,
 * `PromocionDto`): se chequean antes de mandar el 400.
 */
/** Topes del back (`PRECIO_MAXIMO`, `PESO_MAXIMO_KG`, `DESCUENTO_MAXIMO_PROMOCION`), todos con 2 decimales. */
export const MAX_PRICE = 10_000_000;
export const MAX_WEIGHT_KG = 1000;
export const MAX_PROMOTION_DISCOUNT = 99;

const twoDecimals = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

const promotionSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .int('Tiene que ser un entero')
    .min(2, 'Arranca en 2 unidades'),
  discountPercentage: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .positive('Tiene que ser mayor que 0')
    .max(MAX_PROMOTION_DISCOUNT, `No puede superar el ${MAX_PROMOTION_DISCOUNT}%`)
    .refine(twoDecimals, 'Hasta 2 decimales'),
});

export const gasCylinderSchema = z.object({
  type: z.string().trim().min(1, 'Ingresá el tipo de garrafa').max(50, 'Máximo 50 caracteres'),
  weight: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .positive('Tiene que ser mayor que 0')
    .max(MAX_WEIGHT_KG, `No puede superar ${MAX_WEIGHT_KG} kg`)
    .refine(twoDecimals, 'Hasta 2 decimales'),
  price: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .positive('Tiene que ser mayor que 0')
    .max(MAX_PRICE, 'No puede superar $ 10.000.000')
    .refine(twoDecimals, 'Hasta 2 decimales'),
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
