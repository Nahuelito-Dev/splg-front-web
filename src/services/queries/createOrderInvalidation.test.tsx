import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CreateOrderBody } from '../api/types';
import { createOrder } from '../api/orders';
import { useCreateOrder } from './orders';
import { queryKeys } from './queryKeys';

vi.mock('../api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createOrder: vi.fn(),
}));

const setup = () => {
  const client = new QueryClient();
  const spy = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { spy, ...renderHook(() => useCreateOrder(), { wrapper }) };
};

describe('useCreateOrder', () => {
  it('un alta que falla (p. ej. franja completa) refresca los cupos de las franjas', async () => {
    vi.mocked(createOrder).mockRejectedValue(new Error('La franja "Mañana" del 2026-10-31 está completa'));
    const { result, spy } = setup();
    result.current.mutate({} as CreateOrderBody);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.timeSlots.all });
  });

  it('un alta que sale refresca pedidos, reservas y cupos', async () => {
    vi.mocked(createOrder).mockResolvedValue({} as never);
    const { result, spy } = setup();
    result.current.mutate({} as CreateOrderBody);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.reservations.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.timeSlots.all });
  });
});
