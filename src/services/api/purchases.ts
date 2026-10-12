import { idempotencyHeaders } from './idempotency';
import { http } from './httpClient';
import type { ListParams } from './stock';
import type {
  AverageCost,
  CancelPurchaseOrderBody,
  CloseShortPurchaseOrderBody,
  CreatePurchaseOrderBody,
  CreatePurchaseReceiptBody,
  CreateSupplierBody,
  Message,
  PurchaseOrder,
  PurchaseOrderPage,
  PurchaseOrderPending,
  PurchaseReceipt,
  PurchaseReceiptPage,
  Supplier,
  SupplierHistory,
  SupplierPage,
  UpdatePaymentStatusBody,
  UpdatePurchaseOrderBody,
  UpdateSupplierBody,
  VoidPurchaseReceiptBody,
} from './types';

/**
 * El Swagger tipa los textos opcionales como `object`: se redeclaran como `string | null`
 * (el back convierte el vacío en nulo).
 */
type OptionalText<T, K extends keyof T> = Omit<T, K> & { [P in K]?: string | null };
export type SupplierBody = Pick<CreateSupplierBody, 'businessName' | 'cuit' | 'kind'> &
  Record<'contactName' | 'phone' | 'email' | 'address', string | null | undefined> & {
    paymentTermsDays?: number | null;
  };
export type SupplierUpdateBody = Partial<SupplierBody> & Pick<UpdateSupplierBody, 'isActive'>;
export type PurchaseOrderBody = OptionalText<CreatePurchaseOrderBody, 'notes'>;
export type PurchaseOrderUpdateBody = OptionalText<UpdatePurchaseOrderBody, 'notes'>;
export type PurchaseReceiptBody = OptionalText<CreatePurchaseReceiptBody, 'notes'>;

const paging = ({ page, pageSize }: ListParams) => ({ page: page + 1, limit: pageSize });

export interface SupplierFilters {
  term?: string;
  kind?: Supplier['kind'];
  includeInactive?: boolean;
}

/** GET /suppliers */
export const listSuppliers = async (params: ListParams, filters: SupplierFilters): Promise<SupplierPage> => {
  const { data } = await http.get<SupplierPage>('/suppliers', { params: { ...paging(params), ...filters } });
  return data;
};

/** GET /suppliers/:id */
export const getSupplier = async (id: string): Promise<Supplier> => {
  const { data } = await http.get<Supplier>(`/suppliers/${id}`);
  return data;
};

/** POST /suppliers */
export const createSupplier = async (body: SupplierBody, key: string): Promise<Supplier> => {
  const { data } = await http.post<Supplier>('/suppliers', body, { headers: idempotencyHeaders(key) });
  return data;
};

/** PATCH /suppliers/:id */
export const updateSupplier = async (id: string, body: SupplierUpdateBody): Promise<Supplier> => {
  const { data } = await http.patch<Supplier>(`/suppliers/${id}`, body);
  return data;
};

/** DELETE /suppliers/:id: baja lógica. */
export const deleteSupplier = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/suppliers/${id}`);
  return data;
};

/** GET /suppliers/:id/purchase-history */
export const getSupplierHistory = async (
  id: string,
  params: ListParams,
  range: { from?: string; to?: string } = {},
): Promise<SupplierHistory> => {
  const { data } = await http.get<SupplierHistory>(`/suppliers/${id}/purchase-history`, {
    params: { ...paging(params), ...range },
  });
  return data;
};

export interface PurchaseOrderFilters {
  status?: PurchaseOrder['status'];
  supplierId?: string;
  from?: string;
  to?: string;
}

/** GET /purchase-orders */
export const listPurchaseOrders = async (
  params: ListParams,
  filters: PurchaseOrderFilters,
): Promise<PurchaseOrderPage> => {
  const { data } = await http.get<PurchaseOrderPage>('/purchase-orders', { params: { ...paging(params), ...filters } });
  return data;
};

/** GET /purchase-orders/:id */
export const getPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
  const { data } = await http.get<PurchaseOrder>(`/purchase-orders/${id}`);
  return data;
};

/** GET /purchase-orders/:id/pending: lo que todavía falta recibir. */
export const getPurchaseOrderPending = async (id: string): Promise<PurchaseOrderPending> => {
  const { data } = await http.get<PurchaseOrderPending>(`/purchase-orders/${id}/pending`);
  return data;
};

/** POST /purchase-orders */
export const createPurchaseOrder = async (body: PurchaseOrderBody, key: string): Promise<PurchaseOrder> => {
  const { data } = await http.post<PurchaseOrder>('/purchase-orders', body, { headers: idempotencyHeaders(key) });
  return data;
};

/** PATCH /purchase-orders/:id: sólo en borrador. */
export const updatePurchaseOrder = async (id: string, body: PurchaseOrderUpdateBody): Promise<PurchaseOrder> => {
  const { data } = await http.patch<PurchaseOrder>(`/purchase-orders/${id}`, body);
  return data;
};

/** PATCH /purchase-orders/:id/send */
export const sendPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
  const { data } = await http.patch<PurchaseOrder>(`/purchase-orders/${id}/send`);
  return data;
};

/** PATCH /purchase-orders/:id/cancel: 409 si ya tiene recepciones confirmadas. */
export const cancelPurchaseOrder = async (id: string, body: CancelPurchaseOrderBody): Promise<PurchaseOrder> => {
  const { data } = await http.patch<PurchaseOrder>(`/purchase-orders/${id}/cancel`, body);
  return data;
};

/** PATCH /purchase-orders/:id/close-short: lo que falta ya no llega. */
export const closeShortPurchaseOrder = async (
  id: string,
  body: CloseShortPurchaseOrderBody,
): Promise<PurchaseOrder> => {
  const { data } = await http.patch<PurchaseOrder>(`/purchase-orders/${id}/close-short`, body);
  return data;
};

export interface PurchaseReceiptFilters {
  supplierId?: string;
  purchaseOrderId?: string;
  paymentStatus?: PurchaseReceipt['paymentStatus'];
  status?: PurchaseReceipt['status'];
  from?: string;
  to?: string;
}

/** GET /purchase-receipts */
export const listPurchaseReceipts = async (
  params: ListParams,
  filters: PurchaseReceiptFilters,
): Promise<PurchaseReceiptPage> => {
  const { data } = await http.get<PurchaseReceiptPage>('/purchase-receipts', {
    params: { ...paging(params), ...filters },
  });
  return data;
};

/** GET /purchase-receipts/:id */
export const getPurchaseReceipt = async (id: string): Promise<PurchaseReceipt> => {
  const { data } = await http.get<PurchaseReceipt>(`/purchase-receipts/${id}`);
  return data;
};

/** POST /purchase-receipts: entra al stock y recalcula el costo promedio. */
export const createPurchaseReceipt = async (body: PurchaseReceiptBody, key: string): Promise<PurchaseReceipt> => {
  const { data } = await http.post<PurchaseReceipt>('/purchase-receipts', body, { headers: idempotencyHeaders(key) });
  return data;
};

/** PATCH /purchase-receipts/:id/void: contraasiento del lote; 409 si las llenas ya no están en el galpón. */
export const voidPurchaseReceipt = async (
  id: string,
  body: VoidPurchaseReceiptBody,
  key: string,
): Promise<PurchaseReceipt> => {
  const { data } = await http.patch<PurchaseReceipt>(`/purchase-receipts/${id}/void`, body, {
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** PATCH /purchase-receipts/:id/payment-status */
export const updateReceiptPaymentStatus = async (
  id: string,
  body: UpdatePaymentStatusBody,
): Promise<PurchaseReceipt> => {
  const { data } = await http.patch<PurchaseReceipt>(`/purchase-receipts/${id}/payment-status`, body);
  return data;
};

/** GET /purchase-receipts/average-costs */
export const listAverageCosts = async (): Promise<AverageCost[]> => {
  const { data } = await http.get<AverageCost[]>('/purchase-receipts/average-costs');
  return data;
};
