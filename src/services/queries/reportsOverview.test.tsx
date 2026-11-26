import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getReportsOverview: vi.fn() }));
vi.mock('../api/reports', () => api);

import { useReportsDriverSales, useReportsSummary } from './reports';

const OVERVIEW = {
  salesSummary: { current: { totalSales: 10, totalOrders: 1, averageTicket: 10 }, previous: null },
  salesByDriver: {
    rows: [{ driverId: 'd1', driverName: 'Ana', totalOrders: 1, totalSales: 10 }],
    totals: { totalOrders: 1, totalSales: 10 },
  },
};

describe('Reportes por GraphQL: resumen y choferes', () => {
  it('las tarjetas y la tabla comparten una sola consulta y cada una toma su parte', async () => {
    api.getReportsOverview.mockResolvedValue(OVERVIEW);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const range = { from: '2026-10-01', to: '2026-10-31' };

    const { result } = renderHook(
      () => ({ summary: useReportsSummary(range), drivers: useReportsDriverSales(range) }),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.summary.data).toBe(OVERVIEW.salesSummary));
    expect(result.current.drivers.data).toBe(OVERVIEW.salesByDriver);
    expect(api.getReportsOverview).toHaveBeenCalledTimes(1);
    expect(api.getReportsOverview).toHaveBeenCalledWith(range);
  });
});
