import Decimal from 'decimal.js';
import { z } from 'zod';
import { argentinaDay } from '../../../utils/format';

/** La misma tolerancia de reloj del back (5 minutos) para fechas que no pueden ser futuras. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/** El importe tipeado como `Decimal`, o `null` si está vacío o no es un número. */
export const parseAmount = (text: string): Decimal | null => {
  if (text.trim() === '') return null;
  try {
    const amount = new Decimal(text.trim());
    return amount.isFinite() ? amount : null;
  } catch {
    return null;
  }
};

export interface ExpensePaymentRules {
  /** Pide el importe (si no, se paga el total del gasto). */
  withAmount: boolean;
  /** El importe no puede superar este tope. */
  maxAmount?: number | null;
  /** La fecha no puede ser anterior a este día (ISO). */
  notBefore?: string | null;
  dateMessage?: string;
}

/**
 * Pago o cobro de un gasto de la flota o de una compra: caja, fecha (no futura ni anterior al gasto) y, si
 * corresponde, el importe (positivo, hasta dos decimales y sin superar el tope). Las mismas reglas del back.
 */
export const expensePaymentSchema = ({ withAmount, maxAmount, notBefore, dateMessage }: ExpensePaymentRules) =>
  z
    .object({
      cashBoxId: z.string().min(1, 'Elegí la caja'),
      paidAt: z.string().min(1, 'Ingresá la fecha'),
      amount: z.string(),
    })
    .superRefine((values, ctx) => {
      const paidAt = new Date(values.paidAt);
      if (!Number.isNaN(paidAt.getTime())) {
        if (paidAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['paidAt'], message: 'La fecha no puede ser futura' });
        } else if (notBefore && argentinaDay(paidAt) < argentinaDay(notBefore)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['paidAt'],
            message: dateMessage ?? 'La fecha no puede ser anterior a la del gasto',
          });
        }
      }
      if (!withAmount) return;
      const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message });
      const amount = parseAmount(values.amount);
      if (!amount) return fail('Ingresá el importe');
      if (amount.lte(0)) return fail('El importe tiene que ser mayor a 0');
      if (amount.decimalPlaces() > 2) return fail('Hasta 2 decimales');
      if (maxAmount != null && amount.gt(maxAmount)) fail('No puede superar lo cargado al cerrar');
    });

export type ExpensePaymentValues = z.input<ReturnType<typeof expensePaymentSchema>>;
