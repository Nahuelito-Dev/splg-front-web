import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const listDeliveries = vi.hoisted(() => vi.fn());
const listActiveDeliveries = vi.hoisted(() => vi.fn());
vi.mock('../api/deliveries', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listDeliveries: (...args: unknown[]) => listDeliveries(...args) as unknown,
  listActiveDeliveries: (...args: unknown[]) => listActiveDeliveries(...args) as unknown,
}));

import { useDeliveryStatusCounts } from './deliveries';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useDeliveryStatusCounts', () => {
  it('cuenta cada grupo con la misma búsqueda del listado, incluido «En línea»', async () => {
    listDeliveries.mockResolvedValue({ rows: [], total: 4 });
    listActiveDeliveries.mockResolvedValue({ rows: [], total: 1 });
    const { result } = renderHook(() => useDeliveryStatusCounts('ana'), { wrapper });
    await waitFor(() => expect(result.current.online).toBe(1));
    expect(result.current.all).toBe(4);
    for (const [, search] of listDeliveries.mock.calls as [unknown, string][]) expect(search).toBe('ana');
    expect(listActiveDeliveries).toHaveBeenCalledWith({ page: 0, pageSize: 1 }, 'ana');
  });
});
