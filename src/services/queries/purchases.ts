import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelPurchaseOrder,
  closeShortPurchaseOrder,
  createPurchaseOrder,
  createPurchaseReceipt,
  createSupplier,
  deleteSupplier,
  getPurchaseOrder,
  getPurchaseOrderPending,
  getPurchaseReceipt,
  getSupplier,
  getSupplierHistory,
  listAverageCosts,
  listPurchaseOrders,
  listPurchaseReceipts,
  listSuppliers,
  payPurchaseReceipt,
  previewPurchaseTotal,
  sendPurchaseOrder,
  updatePurchaseOrder,
  updateReceiptPaymentStatus,
  updateSupplier,
  voidPurchaseReceipt,
  type PurchaseOrderBody,
  type PurchaseOrderFilters,
  type PurchaseOrderUpdateBody,
  type PurchaseReceiptBody,
  type PurchaseReceiptFilters,
  type SupplierBody,
  type SupplierFilters,
  type SupplierUpdateBody,
} from '../api/purchases';
import type { ListParams } from '../api/stock';
import type {
  CancelPurchaseOrderBody,
  CloseShortPurchaseOrderBody,
  PayFromCashBoxBody,
  UpdatePaymentStatusBody,
  VoidPurchaseReceiptBody,
  PreviewPurchaseTotalBody,
} from '../api/types';
import { refreshFinance, runMoney } from './finance';
import { runIntent } from './intent';
import { PURCHASE_ORDER_STATUS, RECEIPT_STATUS, statusKeys } from '../../utils/statusLabels';
import { useStatusCounts } from './statusCounts';
import { queryKeys } from './queryKeys';
import { invalidateStockViews } from './stock';

interface Options {
  enabled?: boolean;
}

export const useSuppliers = (params: ListParams, filters: SupplierFilters, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.suppliers.list({ ...params, ...filters }),
    queryFn: () => listSuppliers(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Todos los proveedores vigentes, para los combos (una página grande). */
export const useSupplierOptions = ({ enabled = true, term }: Options & { term?: string } = {}) =>
  useQuery({
    queryKey: queryKeys.suppliers.list({ options: true, term: term ?? '' }),
    queryFn: () => listSuppliers({ page: 0, pageSize: 100 }, term ? { term } : {}),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useSupplier = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.suppliers.detail(id ?? ''),
    queryFn: () => getSupplier(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useSupplierHistory = (
  id: string | undefined,
  params: ListParams,
  range: { from?: string; to?: string } = {},
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.suppliers.detail(
      `history:${id}:${params.page}:${params.pageSize}:${range.from ?? ''}:${range.to ?? ''}`,
    ),
    queryFn: () => getSupplierHistory(id ?? '', params, range),
    placeholderData: keepPreviousData,
    enabled: Boolean(id) && enabled,
  });

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: { body: SupplierBody; scope: string }) =>
      runIntent(queryClient, scope, body, (key) => createSupplier(body, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SupplierUpdateBody }) => updateSupplier(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
  });
};

export const usePurchaseOrders = (
  params: ListParams,
  filters: PurchaseOrderFilters,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.purchaseOrders.list({ ...params, ...filters }),
    queryFn: () => listPurchaseOrders(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Cuántas órdenes hay en cada estado, con los demás filtros aplicados. */
export const usePurchaseOrderStatusCounts = (filters: Omit<PurchaseOrderFilters, 'status'>, enabled = true) =>
  useStatusCounts(
    statusKeys(PURCHASE_ORDER_STATUS),
    (status) => queryKeys.purchaseOrders.list({ ...filters, counts: status }),
    (status) => listPurchaseOrders({ page: 0, pageSize: 1 }, { ...filters, status }).then((page) => page.total),
    enabled,
  );

/** Cuántas recepciones hay confirmadas y anuladas, con los demás filtros aplicados. */
export const usePurchaseReceiptStatusCounts = (filters: Omit<PurchaseReceiptFilters, 'status'>, enabled = true) =>
  useStatusCounts(
    statusKeys(RECEIPT_STATUS),
    (status) => queryKeys.purchaseReceipts.list({ ...filters, counts: status }),
    (status) => listPurchaseReceipts({ page: 0, pageSize: 1 }, { ...filters, status }).then((page) => page.total),
    enabled,
  );

export const usePurchaseOrder = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id ?? ''),
    queryFn: () => getPurchaseOrder(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const usePurchaseOrderPending = (id: string | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.purchaseOrders.detail(`pending:${id}`),
    queryFn: () => getPurchaseOrderPending(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: { body: PurchaseOrderBody; scope: string }) =>
      runIntent(queryClient, scope, body, (key) => createPurchaseOrder(body, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all }),
  });
};

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PurchaseOrderUpdateBody }) => updatePurchaseOrder(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all }),
  });
};

export const useSendPurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendPurchaseOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all }),
  });
};

export const useCancelPurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelPurchaseOrderBody }) => cancelPurchaseOrder(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all }),
  });
};

export const useCloseShortPurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CloseShortPurchaseOrderBody }) => closeShortPurchaseOrder(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all }),
  });
};

export const usePurchaseReceipts = (
  params: ListParams,
  filters: PurchaseReceiptFilters,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.purchaseReceipts.list({ ...params, ...filters }),
    queryFn: () => listPurchaseReceipts(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

export const usePurchaseReceipt = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.purchaseReceipts.detail(id ?? ''),
    queryFn: () => getPurchaseReceipt(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useAverageCosts = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: queryKeys.purchaseReceipts.detail('average-costs'), queryFn: listAverageCosts, enabled });

export const useCreatePurchaseReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: { body: PurchaseReceiptBody; scope: string }) =>
      runIntent(queryClient, scope, body, (key) => createPurchaseReceipt(body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useVoidPurchaseReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, scope }: { id: string; body: VoidPurchaseReceiptBody; scope: string }) =>
      runIntent(queryClient, scope, { id, body }, (key) => voidPurchaseReceipt(id, body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useUpdateReceiptPaymentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePaymentStatusBody }) => updateReceiptPaymentStatus(id, body),
    // El historial del proveedor también muestra el estado de pago de cada recepción; el pago en efectivo mueve una caja.
    onSuccess: () =>
      Promise.all(
        [queryKeys.purchaseReceipts, queryKeys.suppliers, queryKeys.cashBoxes, queryKeys.cashMovements].map(
          (resource) => queryClient.invalidateQueries({ queryKey: resource.all }),
        ),
      ),
  });
};

/** Pagar la recepción desde una caja: el total sale de la caja elegida y la recepción queda paga. */
export const usePayPurchaseReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayFromCashBoxBody }) =>
      runMoney(queryClient, `receipt-pay:${id}`, body, (key) => payPurchaseReceipt(id, body, key)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseReceipts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
        refreshFinance(queryClient),
      ]),
  });
};

/** El total de los renglones según el back. Se queda con el último valor mientras llega el nuevo. */
export const usePurchaseTotalPreview = (body: PreviewPurchaseTotalBody) =>
  useQuery({
    queryKey: [...queryKeys.purchaseOrders.all, 'total-preview', body],
    queryFn: () => previewPurchaseTotal(body),
    placeholderData: keepPreviousData,
    retry: false,
  });
