import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStatusCounts } from './statusCounts';

afterEach(cleanup);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useStatusCounts', () => {
  it('pide el total de "todos" y de cada estado; el que falla queda en null, nunca en 0', async () => {
    const totalOf = vi.fn((status: 'open' | 'closed' | undefined) =>
      status === 'closed' ? Promise.reject(new Error('boom')) : Promise.resolve(status === 'open' ? 2 : 5),
    );
    const { result } = renderHook(
      () => useStatusCounts(['open', 'closed'] as const, (status) => ['x', 'list', { status }], totalOf),
      { wrapper },
    );
    await waitFor(() => expect(result.current.all).toBe(5));
    await waitFor(() => expect(result.current.open).toBe(2));
    expect(result.current.closed).toBeNull();
    expect(totalOf).toHaveBeenCalledWith(undefined);
  });

  it('con enabled en false no consulta', () => {
    const totalOf = vi.fn(() => Promise.resolve(1));
    const { result } = renderHook(() => useStatusCounts(['a'] as const, (s) => ['y', s], totalOf, false), { wrapper });
    expect(totalOf).not.toHaveBeenCalled();
    expect(result.current.all).toBeNull();
  });
});
