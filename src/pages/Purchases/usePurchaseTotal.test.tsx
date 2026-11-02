import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const previewPurchaseTotal = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/purchases', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  previewPurchaseTotal,
}));

import { usePurchaseTotal } from './usePurchaseTotal';

afterEach(() => {
  cleanup();
  previewPurchaseTotal.mockReset();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('usePurchaseTotal', () => {
  it('muestra el total que calcula el back para los renglones, sin multiplicarlos acá', async () => {
    previewPurchaseTotal.mockResolvedValue({ items: [{ subtotal: 208020 }], total: 208020.3 });
    const { result } = renderHook(() => usePurchaseTotal([{ quantity: 40, unitCost: 5200.5 }]), { wrapper });
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(208020.3));
    expect(previewPurchaseTotal).toHaveBeenCalledWith({ items: [{ quantity: 40, unitCost: 5200.5 }] });
  });

  it('si el back rechaza los renglones no inventa un total', async () => {
    previewPurchaseTotal.mockRejectedValue(new Error('400'));
    const { result } = renderHook(() => usePurchaseTotal([{ quantity: -1, unitCost: 1 }]), { wrapper });
    await waitFor(() => expect(previewPurchaseTotal).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
