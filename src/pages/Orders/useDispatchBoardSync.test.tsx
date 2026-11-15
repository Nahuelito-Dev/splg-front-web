import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketContext } from '../../context/socketContextValue';

const filter = vi.hoisted(() => ({ accept: true }));
vi.mock('../../hooks/useDistributorEventFilter', () => ({
  useDistributorEventFilter: () => () => filter.accept,
}));

import { POLL_FALLBACK_MS, useDispatchBoardSync } from './useDispatchBoardSync';

type Handler = (payload: unknown) => void;

const net = { online: true };
const setup = (isOnline: boolean) => {
  net.online = isOnline;
  const handlers = new Map<string, Handler>();
  const unsubscribe = vi.fn();
  const subscribe = vi.fn((event: string, handler: Handler) => {
    handlers.set(event, handler);
    return unsubscribe;
  });
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SocketContext.Provider
        value={{ isOnline: net.online, subscribe: subscribe as never, emit: vi.fn(), request: vi.fn() }}
      >
        {children}
      </SocketContext.Provider>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useDispatchBoardSync(), { wrapper });
  return { handlers, unsubscribe, invalidate, hook };
};

beforeEach(() => {
  vi.useFakeTimers();
  filter.accept = true;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useDispatchBoardSync', () => {
  it('al volver el socket de caído a en línea vuelve a pedir los listados; al montar en línea no', () => {
    const { invalidate, hook } = setup(false);
    expect(invalidate).not.toHaveBeenCalled();
    net.online = true;
    hook.rerender();
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders', 'list'] });
    cleanup();
    expect(setup(true).invalidate).not.toHaveBeenCalled();
  });

  it('se suscribe a los eventos del ciclo de vida y los junta en una sola recarga de los listados', () => {
    const { handlers, invalidate } = setup(true);
    expect([...handlers.keys()]).toEqual(
      expect.arrayContaining([
        'order:created',
        'order:accepted',
        'order:on-the-way',
        'order:delivered',
        'order:updated',
        'order:payment-refunded',
        'order:express-degraded',
      ]),
    );
    act(() => {
      handlers.get('order:accepted')?.({ orderId: 'x' });
      handlers.get('order:on-the-way')?.({ orderId: 'x' });
    });
    expect(invalidate).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(500));
    // Una recarga de los listados y una del detalle del pedido que cambió (una sola vez aunque lleguen dos eventos).
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders', 'list'] }, { cancelRefetch: false });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders', 'detail', 'x'] }, { cancelRefetch: false });
  });

  it('descarta los eventos de otra distribuidora', () => {
    filter.accept = false;
    const { handlers, invalidate } = setup(true);
    act(() => {
      handlers.get('order:created')?.({ orderId: 'x', distributorId: 'otra' });
      vi.advanceTimersByTime(500);
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('en línea no sondea; sin socket pide cada 20 s como respaldo', () => {
    expect(setup(true).hook.result.current).toEqual({ isOnline: true, refetchInterval: false });
    cleanup();
    expect(setup(false).hook.result.current).toEqual({ isOnline: false, refetchInterval: POLL_FALLBACK_MS });
  });

  it('al desmontar se desuscribe de todo y cancela la recarga pendiente', () => {
    const { handlers, unsubscribe, invalidate, hook } = setup(true);
    act(() => handlers.get('order:created')?.({}));
    hook.unmount();
    act(() => void vi.advanceTimersByTime(500));
    expect(unsubscribe).toHaveBeenCalledTimes(handlers.size);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
