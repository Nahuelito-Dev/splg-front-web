import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveUnpaidOrder = vi.hoisted(() => vi.fn());
vi.mock('../api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  resolveUnpaidOrder,
}));

import { useResolveUnpaid } from './orders';

const setup = () => {
  const client = new QueryClient();
  const spy = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { spy, ...renderHook(() => useResolveUnpaid(), { wrapper }) };
};

const VARS = {
  id: 'o-1',
  body: { resolution: 'paid' as const, note: 'Pagó' },
  idempotencyKey: '5d0c7b0e-6c0e-4c40-8f6f-0a8c0f1a2b3c',
};

beforeEach(() => {
  resolveUnpaidOrder.mockReset().mockResolvedValue({ order_id: 'o-1', alreadyResolved: false });
});

describe('useResolveUnpaid', () => {
  it('hace UNA sola llamada con la clave e invalida pedidos, incidencias, reportes y estadísticas', async () => {
    const { result, spy } = setup();
    result.current.mutate(VARS);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(resolveUnpaidOrder).toHaveBeenCalledTimes(1);
    expect(resolveUnpaidOrder).toHaveBeenCalledWith('o-1', VARS.body, VARS.idempotencyKey);
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey as string[])[0]);
    expect(keys).toEqual(expect.arrayContaining(['orders', 'incidents', 'reports', 'stats', 'cashSettings']));
  });

  it('devuelve alreadyResolved tal como lo manda el back', async () => {
    resolveUnpaidOrder.mockResolvedValue({ order_id: 'o-1', alreadyResolved: true });
    const { result } = setup();
    result.current.mutate(VARS);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.alreadyResolved).toBe(true);
  });

  it('si falla (409) devuelve el error y refresca igual', async () => {
    resolveUnpaidOrder.mockImplementation(() => Promise.reject(new Error('ya resuelto')));
    const { result, spy } = setup();
    result.current.mutate(VARS);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('ya resuelto');
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });
});
