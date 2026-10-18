import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import type { Quote, QuoteOrderBody } from '../api/types';

const quoteOrder = vi.hoisted(() => vi.fn());
vi.mock('../api/orders', () => ({ quoteOrder }));

import { OrderQuoteCard } from '../../pages/Orders/components/OrderQuoteCard';
import { useOrderQuote } from './orders';

const body = (quantity: number): QuoteOrderBody => ({
  customerId: 'c1',
  addressId: 'a1',
  paymentMethod: 'cash',
  deliveryMode: 'standard',
  items: [{ gasCylinderId: 'g1', quantity, unitPrice: 100 }],
});
const quote = (total: number) =>
  ({
    items: [],
    subtotal: total,
    zoneSurcharge: 0,
    paymentSurcharge: 0,
    expressSurcharge: 0,
    total,
  }) as unknown as Quote;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const wrapperFor = () => {
  const client = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  quoteOrder.mockReset();
});

describe('useOrderQuote', () => {
  it('dos cambios en menos de 400 ms hacen un solo POST, con el último cuerpo', async () => {
    quoteOrder.mockResolvedValue(quote(1));
    const { rerender } = renderHook(({ b }) => useOrderQuote(b), {
      wrapper: wrapperFor(),
      initialProps: { b: null as QuoteOrderBody | null },
    });
    rerender({ b: body(1) });
    await act(() => vi.advanceTimersByTimeAsync(200));
    rerender({ b: body(2) });
    await act(() => vi.advanceTimersByTimeAsync(200));
    rerender({ b: body(3) });
    await act(() => vi.advanceTimersByTimeAsync(399));
    expect(quoteOrder).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(2));
    expect(quoteOrder).toHaveBeenCalledTimes(1);
    expect(quoteOrder).toHaveBeenCalledWith(body(3));
  });

  it('si la respuesta de A llega después de la de B, se muestra B', async () => {
    const a = deferred<Quote>();
    const b = deferred<Quote>();
    quoteOrder.mockImplementation((sent: QuoteOrderBody) => (sent.items?.[0]?.quantity === 1 ? a.promise : b.promise));
    const { result, rerender } = renderHook(({ x }) => useOrderQuote(x), {
      wrapper: wrapperFor(),
      initialProps: { x: body(1) as QuoteOrderBody | null },
    });
    await act(() => vi.advanceTimersByTimeAsync(400));
    rerender({ x: body(2) });
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(quoteOrder).toHaveBeenCalledTimes(2);
    b.resolve(quote(222));
    await act(() => vi.advanceTimersByTimeAsync(10));
    a.resolve(quote(111));
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(result.current.data?.total).toBe(222);
    expect(result.current.stale).toBe(false);
  });

  it('con null no consulta', async () => {
    renderHook(() => useOrderQuote(null), { wrapper: wrapperFor() });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(quoteOrder).not.toHaveBeenCalled();
  });
});

describe('OrderQuoteCard', () => {
  it('el error de la cotización anterior se oculta mientras el cuerpo nuevo está por consultarse', async () => {
    quoteOrder.mockRejectedValue(new ApiError(400, ['Stock insuficiente']));
    const client = new QueryClient();
    const view = (b: QuoteOrderBody) => (
      <QueryClientProvider client={client}>
        <OrderQuoteCard body={b} hint="" />
      </QueryClientProvider>
    );
    const { rerender } = render(view(body(1)));
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(screen.getByRole('alert')).toHaveTextContent('Stock insuficiente');
    rerender(view(body(2)));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Actualizando…')).toBeInTheDocument();
  });
});
