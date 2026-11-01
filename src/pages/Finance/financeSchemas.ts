import { z } from 'zod';
import { argentinaDay, formatCurrency } from '../../utils/format';

/** Importe como lo escribe una persona: `1234.5` o `1234,50`, con a lo sumo dos decimales. */
const MONEY = /^\d+(?:[.,]\d{1,2})?$/;

/** Tope de cualquier importe en el back (`IMPORTE_MAXIMO`): entra en un `numeric(12,2)`. */
export const MAX_MONEY = 9_999_999_999.99;
const MAX_MONEY_MESSAGE = 'El importe es demasiado grande (máximo 9.999.999.999,99)';

/** ¿Es un importe legible, como lo escribe una persona (`1234.5` o `1234,50`)? */
export const isMoneyText = (value: string): boolean => MONEY.test(value.trim());

/** Texto → número (acepta coma decimal). */
export const parseMoney = (value: string): number => Number(value.trim().replace(',', '.'));

/** Un importe mayor que cero. */
export const positiveMoney = (empty = 'Ingresá el importe') =>
  z
    .string()
    .trim()
    .min(1, empty)
    .refine((v) => MONEY.test(v) && parseMoney(v) > 0, 'Un importe mayor a cero, con hasta dos decimales')
    .refine((v) => !MONEY.test(v) || parseMoney(v) <= MAX_MONEY, MAX_MONEY_MESSAGE);

/** Un importe que puede ser cero. */
export const nonNegativeMoney = (empty = 'Ingresá el importe') =>
  z
    .string()
    .trim()
    .min(1, empty)
    .refine((v) => MONEY.test(v), 'Un importe de cero o más, con hasta dos decimales')
    .refine((v) => !MONEY.test(v) || parseMoney(v) <= MAX_MONEY, MAX_MONEY_MESSAGE);

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

/** Un día real que no es futuro (el día se cuenta en Buenos Aires, como en el back). */
export const pastDay = (empty = 'Elegí la fecha', future = 'La fecha no puede ser futura') =>
  day(empty).refine((v) => v <= argentinaDay(new Date()), future);

/**
 * El back no deja una caja de efectivo en negativo (409 «Saldo insuficiente»); banco y billetera sí.
 * Devuelve el mensaje si sacar `amount` de la caja la dejaría debajo de cero.
 */
export const insufficientCashMessage = (
  box: { kind: string; balance: number | string; name?: string } | undefined,
  amount: number,
): string | undefined => {
  if (!box || box.kind !== 'cash' || !(amount > 0)) return undefined;
  const balance = Math.round(Number(box.balance) * 100);
  if (Math.round(amount * 100) <= balance) return undefined;
  return `Saldo insuficiente: la caja tiene ${formatCurrency(Number(box.balance))} y no puede quedar en negativo`;
};
