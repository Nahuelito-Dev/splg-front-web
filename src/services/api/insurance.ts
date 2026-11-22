import { env } from '../../config/env';
import { idempotencyHeaders } from './idempotency';
import { http } from './httpClient';
import type { ListParams } from './stock';
import type {
  CancelInsurancePolicyBody,
  CancelledInsurancePolicy,
  CarInsurance,
  CreateInsurancePolicyBody,
  CreateInsurerBody,
  CreatedInsurancePolicy,
  InsuranceInstallment,
  InsuranceInstallmentDetail,
  InsuranceInstallmentPage,
  InsurancePolicy,
  Insurer,
  InsurerPage,
  PayInsuranceInstallmentBody,
  UpdateInsuranceInstallmentBody,
  UpdateInsurancePolicyBody,
  UpdateInsurerBody,
  UploadedReceipt,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };
const paging = ({ page, pageSize }: ListParams) => ({ page: page + 1, limit: pageSize });

/** GET /v2/insurers */
export const listInsurers = async (params: ListParams, term?: string): Promise<InsurerPage> => {
  const { data } = await http.get<InsurerPage>('/insurers', {
    ...v2,
    params: { ...paging(params), ...(term ? { term } : {}) },
  });
  return data;
};

/** GET /v2/insurers/:id */
export const getInsurer = async (id: string): Promise<Insurer> => {
  const { data } = await http.get<Insurer>(`/insurers/${id}`, v2);
  return data;
};

/** POST /v2/insurers */
export const createInsurer = async (body: CreateInsurerBody, key: string): Promise<Insurer> => {
  const { data } = await http.post<Insurer>('/insurers', body, { ...v2, headers: idempotencyHeaders(key) });
  return data;
};

/** PATCH /v2/insurers/:id */
export const updateInsurer = async (id: string, body: UpdateInsurerBody): Promise<Insurer> => {
  const { data } = await http.patch<Insurer>(`/insurers/${id}`, body, v2);
  return data;
};

/** DELETE /v2/insurers/:id: baja lógica (409 si tiene pólizas vigentes o futuras). */
export const deleteInsurer = async (id: string): Promise<void> => {
  await http.delete(`/insurers/${id}`, v2);
};

/** GET /v2/cars/:carId/insurance: la póliza vigente y el historial. */
export const getCarInsurance = async (carId: string): Promise<CarInsurance> => {
  const { data } = await http.get<CarInsurance>(`/cars/${carId}/insurance`, v2);
  return data;
};

/** POST /v2/insurance-policies: la póliza con su plan de cuotas (`fleet` dice si el vencimiento pasó a Flota). */
export const createInsurancePolicy = async (
  body: CreateInsurancePolicyBody,
  key: string,
): Promise<CreatedInsurancePolicy> => {
  const { data } = await http.post<CreatedInsurancePolicy>('/insurance-policies', body, {
    ...v2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** PATCH /v2/insurance-policies/:id */
export const updateInsurancePolicy = async (id: string, body: UpdateInsurancePolicyBody): Promise<InsurancePolicy> => {
  const { data } = await http.patch<InsurancePolicy>(`/insurance-policies/${id}`, body, v2);
  return data;
};

/** POST /v2/insurance-policies/:id/cancel: baja lógica; las cuotas pendientes se cancelan, las pagas quedan. */
export const cancelInsurancePolicy = async (
  id: string,
  body: CancelInsurancePolicyBody,
): Promise<CancelledInsurancePolicy> => {
  const { data } = await http.post<CancelledInsurancePolicy>(`/insurance-policies/${id}/cancel`, body, v2);
  return data;
};

export interface InstallmentFilters {
  status?: InsuranceInstallment['status'];
  approvalStatus?: InsuranceInstallment['approvalStatus'];
  dueFrom?: string;
  dueTo?: string;
  carId?: string;
}

/** GET /v2/insurance-installments */
export const listInsuranceInstallments = async (
  params: ListParams,
  filters: InstallmentFilters = {},
): Promise<InsuranceInstallmentPage> => {
  const { data } = await http.get<InsuranceInstallmentPage>('/insurance-installments', {
    ...v2,
    params: { ...paging(params), ...filters },
  });
  return data;
};

/** PATCH /v2/insurance-installments/:id: fecha, gracia o importe mientras esté pendiente. */
export const updateInsuranceInstallment = async (
  id: string,
  body: UpdateInsuranceInstallmentBody,
): Promise<InsuranceInstallmentDetail> => {
  const { data } = await http.patch<InsuranceInstallmentDetail>(`/insurance-installments/${id}`, body, v2);
  return data;
};

/**
 * POST /v2/insurance-installments/:id/receipt (multipart `file`): sube el comprobante y lo lee en el mismo pedido.
 * `scan.available` es `false` sin lector y `scan.data` es `null` si no pudo leerlo: la subida vale igual.
 */
export const uploadInstallmentReceipt = async (id: string, file: File, key: string): Promise<UploadedReceipt> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post<UploadedReceipt>(`/insurance-installments/${id}/receipt`, form, {
    ...v2,
    headers: { 'Content-Type': 'multipart/form-data', ...idempotencyHeaders(key) },
  });
  return data;
};

/** POST /v2/insurance-installments/:id/pay: deja la cuota paga con su comprobante y el movimiento de la caja. */
export const payInsuranceInstallment = async (
  id: string,
  body: PayInsuranceInstallmentBody,
  key: string,
): Promise<InsuranceInstallment> => {
  const { data } = await http.post<InsuranceInstallment>(`/insurance-installments/${id}/pay`, body, {
    ...v2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** GET /v2/insurance-installments/:id: la cuota con su póliza y el vehículo (para abrir el aviso que apunta a ella). */
export const getInsuranceInstallment = async (id: string): Promise<InsuranceInstallmentDetail> => {
  const { data } = await http.get<InsuranceInstallmentDetail>(`/insurance-installments/${id}`, v2);
  return data;
};

/**
 * POST /v2/insurance-installments/:id/approve: aprueba el pago de una cuota «pendiente de aprobación» (queda quién y
 * cuándo). No mueve plata: el pago se registra después con `payInsuranceInstallment`.
 */
export const approveInsuranceInstallment = async (id: string): Promise<InsuranceInstallmentDetail> => {
  const { data } = await http.post<InsuranceInstallmentDetail>(`/insurance-installments/${id}/approve`, undefined, v2);
  return data;
};
