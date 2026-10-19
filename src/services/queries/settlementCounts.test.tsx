import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getFinanceDashboard = vi.hoisted(() => vi.fn());
const listDriverSettlements = vi.hoisted(() => vi.fn());
vi.mock('../api/finance', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getFinanceDashboard: (...args: unknown[]) => getFinanceDashboard(...args) as unknown,
  listDriverSettlements: (...args: unknown[]) => listDriverSettlements(...args) as unknown,
}));

import { useSettlementCounts } from './finance';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useSettlementCounts', () => {
  it('con un día elegido toma los conteos del tablero y no pide uno por estado', async () => {
    getFinanceDashboard.mockResolvedValue({ settlements: { open: 2, submitted: 3, approved: 1 } });
    const { result } = renderHook(() => useSettlementCounts('2026-10-15'), { wrapper });
    await waitFor(() => expect(result.current.all).toBe(6));
    expect(result.current).toEqual({ all: 6, open: 2, submitted: 3, approved: 1 });
    expect(getFinanceDashboard).toHaveBeenCalledWith('2026-10-15');
    expect(listDriverSettlements).not.toHaveBeenCalled();
  });

  it('sin día («todos los días») cuenta estado por estado y no consulta el tablero', async () => {
    listDriverSettlements.mockImplementation((_page: unknown, filters: { status?: string }) =>
      Promise.resolve({ data: [], total: filters.status ? 1 : 9 }),
    );
    const { result } = renderHook(() => useSettlementCounts(undefined), { wrapper });
    await waitFor(() => expect(result.current.all).toBe(9));
    expect(result.current.open).toBe(1);
    expect(getFinanceDashboard).not.toHaveBeenCalled();
  });
});
