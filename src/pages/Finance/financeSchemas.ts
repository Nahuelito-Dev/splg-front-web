import { z } from 'zod';

/** Importe como lo escribe una persona: `1234.5` o `1234,50`, con a lo sumo dos decimales. */
const MONEY = /^\d+(?:[.,]\d{1,2})?$/;

/** Texto → número (acepta coma decimal). */
export const parseMoney = (value: string): number => Number(value.trim().replace(',', '.'));

/** Un importe mayor que cero. */
export const positiveMoney = (empty = 'Ingresá el importe') =>
  z
    .string()
    .trim()
    .min(1, empty)
    .refine((v) => MONEY.test(v) && parseMoney(v) > 0, 'Un importe mayor a cero, con hasta dos decimales');

/** Un importe que puede ser cero. */
export const nonNegativeMoney = (empty = 'Ingresá el importe') =>
  z
    .string()
    .trim()
    .min(1, empty)
    .refine((v) => MONEY.test(v), 'Un importe de cero o más, con hasta dos decimales');

/** Texto libre obligatorio con tope de largo. */
export const requiredText = (empty: string, max: number) =>
  z.string().trim().min(1, empty).max(max, `No puede tener más de ${max} caracteres`);

/** Texto libre opcional con tope de largo. */
export const optionalText = (max: number) => z.string().trim().max(max, `No puede tener más de ${max} caracteres`);

/** Un día `YYYY-MM-DD` real. */
export const day = (empty = 'Elegí la fecha') =>
  z
    .string()
    .min(1, empty)
    .refine(
      (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime()),
      'Fecha inválida',
    );
