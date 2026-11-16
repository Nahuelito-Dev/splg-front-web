import { z } from 'zod';
import type { PaymentSurchargeConfig, PaymentSurchargeConfigBody } from '../../services/api/types';

/** Mismos límites que el DTO del back (`PaymentSurchargeConfigDto`): 0 a 30 %, hasta 2 decimales. */
export const SURCHARGE_MIN = 0;
export const SURCHARGE_MAX = 30;

/** Lo que regía antes de que fuera configurable. */
export const DEFAULT_SURCHARGES = { transfer: '10', mercadoPago: '10', cash: '0' } as const;

/** Lo que tipea la persona: todo como texto. */
export interface PaymentSurchargeFormValues {
  transfer: string;
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
  transfer: percentage,
  mercadoPago: percentage,
  cash: percentage,
});

export const valuesOf = (config: PaymentSurchargeConfig): PaymentSurchargeFormValues => ({
  transfer: String(config.transferPercentage),
  mercadoPago: String(config.mercadoPagoPercentage),
  cash: String(config.cashPercentage),
});

const toNumber = (raw: string): number => Number(raw.trim().replace(',', '.'));

/** El cuerpo del PUT a partir de lo tipeado (sólo llamar si no hay errores). */
export const toPaymentSurchargeBody = (v: PaymentSurchargeFormValues): PaymentSurchargeConfigBody => ({
  transferPercentage: toNumber(v.transfer),
  mercadoPagoPercentage: toNumber(v.mercadoPago),
  cashPercentage: toNumber(v.cash),
});
