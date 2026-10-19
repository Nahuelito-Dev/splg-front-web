import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const listOrders = vi.hoisted(() => vi.fn<[unknown, { status: string }], Promise<unknown>>());
vi.mock('../api/orders', () => ({ listOrders }));

import { useDispatchBoard } from './orders';

describe('useDispatchBoard', () => {
  it('pide una página de 100 por cada etapa del tablero, con su estado, y las mantiene separadas', async () => {
    listOrders.mockImplementation((_page, filters) =>
      Promise.resolve({ orders: [], total: filters.status === 'pending' ? 7 : 0 }),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDispatchBoard(), { wrapper });
    await waitFor(() => expect(result.current.delivered.data).toBeDefined());
    expect(listOrders.mock.calls.map(([page, filters]) => [page, filters.status])).toEqual([
      [{ page: 0, pageSize: 100 }, 'pending'],
      [{ page: 0, pageSize: 100 }, 'accepted'],
      [{ page: 0, pageSize: 100 }, 'out_for_delivery'],
      [{ page: 0, pageSize: 100 }, 'delivered'],
    ]);
    expect(result.current.pending.data?.total).toBe(7);
    expect(result.current.accepted.data?.total).toBe(0);
  });
});
