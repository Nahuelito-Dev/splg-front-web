import { env } from '../../config/env';
import { http } from './httpClient';
import type { PaymentSurchargeConfig, PaymentSurchargeConfigBody } from './types';

/** GET /v2/payment-surcharges: recargo (%) de transferencia, Mercado Pago y efectivo de la distribuidora. */
export const getPaymentSurcharges = async (): Promise<PaymentSurchargeConfig> => {
  const { data } = await http.get<PaymentSurchargeConfig>('/payment-surcharges', { baseURL: env.apiUrlV2 });
  return data;
};

/** PUT /v2/payment-surcharges: reemplaza la configuración: los tres porcentajes son obligatorios. */
export const putPaymentSurcharges = async (body: PaymentSurchargeConfigBody): Promise<PaymentSurchargeConfig> => {
  const { data } = await http.put<PaymentSurchargeConfig>('/payment-surcharges', body, { baseURL: env.apiUrlV2 });
  return data;
};
