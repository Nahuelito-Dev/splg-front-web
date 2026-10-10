import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  updateOrder: vi.fn().mockResolvedValue({ order_id: 'o-1' }),
}));

import { useUpdateOrder } from './orders';

describe('useUpdateOrder', () => {
  it('al editar invalida pedidos, catálogo (stock) y estadísticas', async () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateOrder(), { wrapper });
    result.current.mutate({ id: 'o-1', body: { notes: 'x' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey as string[])[0]);
    expect(keys).toEqual(expect.arrayContaining(['orders', 'gasCylinders', 'stats']));
  });
});
