import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const listOrders = vi.fn((_page: unknown, filters: { status?: string }) =>
  Promise.resolve({ orders: [], total: filters.status === 'delivered' ? 100 : 2 }),
);
vi.mock('../api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listOrders: (page: unknown, filters: { status?: string }) => listOrders(page, filters),
}));
vi.mock('../api/stats', () => ({
  getOrderStats: () => Promise.resolve({ ordersSummary: { pending: 9, accepted: 5, onTheWay: 6, deliveredToday: 0 } }),
  getSalesChart: vi.fn(),
}));

import { useOrderStatusCounts } from './orders';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useOrderStatusCounts', () => {
  it('pendientes, aceptados y en camino salen del resumen: el listado sólo se pide para el resto', async () => {
    const { result } = renderHook(() => useOrderStatusCounts(), { wrapper });
    await waitFor(() => expect(result.current.total).not.toBeNull());
    expect(result.current.counts).toMatchObject({
      pending: 9,
      accepted: 5,
      out_for_delivery: 6,
      delivered: 100,
      reserved: 2,
      cancelled: 2,
    });
    const asked = listOrders.mock.calls.map(([, filters]) => filters.status).sort();
    expect(asked).toEqual(['cancelled', 'delivered', 'reserved']);
  });

  it('con búsqueda, cobro o fechas ya no sirve el resumen global: cada estado se pide con esos filtros', async () => {
    const { result } = renderHook(() => useOrderStatusCounts({ search: 'ana', paymentStatus: 'paid' }), { wrapper });
    await waitFor(() => expect(result.current.total).not.toBeNull());
    expect(result.current.counts).toMatchObject({ pending: 2, accepted: 2, out_for_delivery: 2, delivered: 100 });
    const calls = listOrders.mock.calls as unknown as [unknown, { status?: string; search?: string }][];
    expect(calls.map(([, filters]) => filters.status).sort()).toEqual([
      'accepted',
      'cancelled',
      'delivered',
      'out_for_delivery',
      'pending',
      'reserved',
    ]);
    expect(calls.every(([, filters]) => filters.search === 'ana')).toBe(true);
  });
});
