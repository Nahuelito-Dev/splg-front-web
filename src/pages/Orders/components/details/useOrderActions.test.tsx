import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { useOrderActions } from './useOrderActions';

vi.mock('../../../../services/api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getOrderDeliveryCode: vi.fn((id: string) => Promise.resolve({ deliveryCode: `codigo-de-${id}` })),
}));
vi.mock('../../../../utils/notifications', () => ({
  confirm: vi.fn(() => Promise.resolve(true)),
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

afterEach(cleanup);

const order = (id: string, status: Order['status'] = 'accepted') => ({ order_id: id, status }) as Order;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useOrderActions: código de entrega', () => {
  it('el código visto en un pedido no se muestra en otro', async () => {
    const { result, rerender } = renderHook(({ o }) => useOrderActions(o), {
      wrapper,
      initialProps: { o: order('A') },
    });
    await act(async () => {
      await result.current.viewCode();
    });
    await waitFor(() => expect(result.current.revealedCode).toBe('codigo-de-A'));
    rerender({ o: order('B') });
    expect(result.current.revealedCode).toBeNull();
  });

  it('no se muestra si el pedido ya no está aceptado ni en camino', async () => {
    const { result, rerender } = renderHook(({ o }) => useOrderActions(o), {
      wrapper,
      initialProps: { o: order('A') },
    });
    await act(async () => {
      await result.current.viewCode();
    });
    await waitFor(() => expect(result.current.revealedCode).toBe('codigo-de-A'));
    rerender({ o: order('A', 'delivered') });
    expect(result.current.revealedCode).toBeNull();
  });
});
