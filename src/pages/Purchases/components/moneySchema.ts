import { z } from 'zod';

/** ¿Tiene a lo sumo 2 decimales? Tolera el error de coma flotante (0.07 * 100 = 7.000000000000001). */
export const hasAtMostTwoDecimals = (value: number): boolean => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

/** Costo por garrafa (`unitCost` de los DTO de compras): de 0 a $90.000 y hasta 2 decimales, como valida el back. */
export const moneySchema = z.coerce
  .number({ invalid_type_error: 'Ingresá un número' })
  .min(0, 'No puede ser negativo')
  .max(90000, 'Hasta $90.000 por garrafa')
  .refine(hasAtMostTwoDecimals, 'Hasta 2 decimales');
