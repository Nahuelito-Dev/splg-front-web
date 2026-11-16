import { env } from '../../config/env';
import { http } from './httpClient';
import type { BankDetails, BankDetailsBody } from './types';

/** GET /v2/distributor/bank-details: CBU, alias y titular de la distribuidora (`null` en lo que no se cargó). */
export const getBankDetails = async (): Promise<BankDetails> => {
  const { data } = await http.get<BankDetails>('/distributor/bank-details', { baseURL: env.apiUrlV2 });
  return data;
};

/** PUT /v2/distributor/bank-details: reemplaza los tres datos; el que va `null` queda sin cargar. */
export const putBankDetails = async (body: BankDetailsBody): Promise<BankDetails> => {
  const { data } = await http.put<BankDetails>('/distributor/bank-details', body, { baseURL: env.apiUrlV2 });
  return data;
};
