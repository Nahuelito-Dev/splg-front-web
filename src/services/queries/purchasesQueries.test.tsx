import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPurchaseReceipt,
  getSupplierHistory,
  updateReceiptPaymentStatus,
  voidPurchaseReceipt,
} from '../api/purchases';
import { queryKeys } from './queryKeys';
import {
  useCreatePurchaseReceipt,
  useSupplierHistory,
  useUpdateReceiptPaymentStatus,
  useVoidPurchaseReceipt,
} from './purchases';

vi.mock('../api/purchases', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getSupplierHistory: vi.fn(),
  createPurchaseReceipt: vi.fn(),
  voidPurchaseReceipt: vi.fn(),
  updateReceiptPaymentStatus: vi.fn(),
}));

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useSupplierHistory', () => {
  it('manda el rango de fechas al back y lo distingue en la caché', async () => {
    vi.mocked(getSupplierHistory).mockResolvedValue({ data: [], total: 0 } as never);
    const { wrapper } = setup();
    const params = { page: 0, pageSize: 10 };
    const { result, rerender } = renderHook(
      ({ range }: { range: { from?: string; to?: string } }) => useSupplierHistory('s-1', params, range),
      { wrapper, initialProps: { range: {} } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ range: { from: '2026-10-01', to: '2026-10-31' } });
    await waitFor(() =>
      expect(getSupplierHistory).toHaveBeenLastCalledWith('s-1', params, { from: '2026-10-01', to: '2026-10-31' }),
    );
    expect(getSupplierHistory).toHaveBeenCalledTimes(2);
  });
});

describe('el historial del proveedor no se queda viejo', () => {
  it('crear una recepción refresca los proveedores', async () => {
    vi.mocked(createPurchaseReceipt).mockResolvedValue({} as never);
    const { queryClient, wrapper } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreatePurchaseReceipt(), { wrapper });
    result.current.mutate({ body: {} as never, scope: 'receipt:new' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.suppliers.all });
  });

  it('anular una recepción refresca los proveedores', async () => {
    vi.mocked(voidPurchaseReceipt).mockResolvedValue({} as never);
    const { queryClient, wrapper } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useVoidPurchaseReceipt(), { wrapper });
    result.current.mutate({ id: 'r-1', body: { reason: 'x' } as never, scope: 'void:r-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.suppliers.all });
  });

  it('marcar el pago de una recepción refresca los proveedores (su historial muestra el pago)', async () => {
    vi.mocked(updateReceiptPaymentStatus).mockResolvedValue({} as never);
    const { queryClient, wrapper } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateReceiptPaymentStatus(), { wrapper });
    result.current.mutate({ id: 'r-1', body: { paymentStatus: 'paid' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.suppliers.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.purchaseReceipts.all });
  });
});
