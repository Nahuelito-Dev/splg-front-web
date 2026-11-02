import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quoteFuelLoad } from '../api/fleetExpense';
import { useFuelLoadQuote } from './fleetExpense';

vi.mock('../api/fleetExpense', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  quoteFuelLoad: vi.fn(),
}));

describe('useFuelLoadQuote', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mientras llega la cuenta de los valores nuevos, lo que muestra queda como viejo (stale)', async () => {
    let release: (value: unknown) => void = () => undefined;
    vi.mocked(quoteFuelLoad).mockImplementation((liters, unitPrice) =>
      liters === 40
        ? Promise.resolve({ liters, unitPrice, totalAmount: 40000 })
        : new Promise((resolve) => {
            release = resolve as (value: unknown) => void;
          }),
    );
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(({ liters }) => useFuelLoadQuote({ liters, unitPrice: 1000 }), {
      wrapper,
      initialProps: { liters: 40 },
    });
    await waitFor(() => expect(result.current.data?.totalAmount).toBe(40000));
    expect(result.current.stale).toBe(false);

    rerender({ liters: 50 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    // La consulta de 50 L está en vuelo: el dato de 40 L sigue a la vista pero es viejo.
    expect(result.current.data?.totalAmount).toBe(40000);
    expect(result.current.stale).toBe(true);

    act(() => {
      release({ liters: 50, unitPrice: 1000, totalAmount: 50000 });
    });
    await waitFor(() => expect(result.current.data?.totalAmount).toBe(50000));
    expect(result.current.stale).toBe(false);
  });
});
