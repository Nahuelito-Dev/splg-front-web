import { z } from 'zod';
import type { PaymentSurchargeConfig, PaymentSurchargeConfigBody } from '../../services/api/types';

/** Mismos límites que el DTO del back (`PaymentSurchargeConfigDto`): 0 a 30 %, hasta 2 decimales. */
export const SURCHARGE_MIN = 0;
export const SURCHARGE_MAX = 30;

/** Lo que regía antes de que fuera configurable. La transferencia ya no se acepta: no se configura. */
export const DEFAULT_SURCHARGES = { mercadoPago: '10', cash: '0' } as const;

/** Lo que tipea la persona: todo como texto. */
export interface PaymentSurchargeFormValues {
  mercadoPago: string;
  cash: string;
}

const percentage = z.string().superRefine((raw, ctx) => {
  const add = (message: string) => ctx.addIssue({ code: 'custom', message });
  const text = raw.trim().replace(',', '.');
  if (text === '' || !/^\d+(\.\d+)?$/.test(text)) return add('Ingresá un porcentaje, por ejemplo 7,5');
  const value = Number(text);
  if (value < SURCHARGE_MIN || value > SURCHARGE_MAX)
    return add(`Tiene que estar entre ${SURCHARGE_MIN} y ${SURCHARGE_MAX}`);
  if (Math.round(value * 100) / 100 !== value) return add('Hasta 2 decimales');
});

export const paymentSurchargeSchema = z.object({
  mercadoPago: percentage,
  cash: percentage,
});

export const valuesOf = (config: PaymentSurchargeConfig): PaymentSurchargeFormValues => ({
  mercadoPago: String(config.mercadoPagoPercentage),
  cash: String(config.cashPercentage),
});

const toNumber = (raw: string): number => Number(raw.trim().replace(',', '.'));

/** El cuerpo del PUT a partir de lo tipeado (sólo llamar si no hay errores). No manda el recargo de transferencia. */
export const toPaymentSurchargeBody = (v: PaymentSurchargeFormValues): PaymentSurchargeConfigBody => ({
  mercadoPagoPercentage: toNumber(v.mercadoPago),
  cashPercentage: toNumber(v.cash),
});
