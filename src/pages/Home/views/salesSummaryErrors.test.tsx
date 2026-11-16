import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const q = vi.hoisted(() => ({ summary: vi.fn(), evolution: vi.fn(), stats: vi.fn(), daily: vi.fn() }));

vi.mock('../../../services/queries/reports', () => ({
  useSalesSummary: (...a: unknown[]) => q.summary(...a) as unknown,
  useSalesEvolution: (...a: unknown[]) => q.evolution(...a) as unknown,
}));
vi.mock('../../../services/queries/stats', () => ({ useOrderStats: () => q.stats() as unknown }));
vi.mock('../lib/useDailySales', () => ({ useDailySales: () => q.daily() as unknown }));
vi.mock('../../../theme/useChartPalette', () => ({
  useChartPalette: () => ({
    grid: '#000',
    axis: '#000',
    axisStrong: '#000',
    tooltipBorder: '#000',
    tooltipBg: '#fff',
    isDark: false,
  }),
}));
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="grafico">{children}</div>,
}));

import { KpiRow } from './KpiRow';
import { SalesAreaCard } from './SalesAreaCard';

const point = (key: string, sales: number) => ({ key, label: key, sales, orders: sales ? 1 : 0 });
const points = Array.from({ length: 60 }, (_, i) => point(`2026-09-${String((i % 28) + 1).padStart(2, '0')}`, 100));
const refetch = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const setup = (summary: unknown) => {
  q.summary.mockReturnValue(summary);
  q.evolution.mockReturnValue({ data: [], isLoading: false, error: null, refetch });
  q.stats.mockReturnValue({
    data: { sales: { today: 0 }, ordersSummary: { pending: 0, accepted: 0, onTheWay: 0, deliveredToday: 0 } },
    isLoading: false,
  });
  q.daily.mockReturnValue({ points, today: '2026-10-31', isLoading: false, error: null, refetch });
};

const failedSummary = { data: undefined, isLoading: false, isError: true, error: new Error('500'), refetch };

describe('si falla sales-summary', () => {
  it('los indicadores muestran «—» y un aviso, nunca $0', () => {
    setup(failedSummary);
    render(<KpiRow />);
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    const card = screen.getByText('Ventas cobradas de 30 días').closest('div') as HTMLElement;
    expect(card.parentElement?.textContent).toContain('—');
    expect(card.parentElement?.textContent).not.toMatch(/\$\s?0/);
  });

  it('el gráfico de ventas se sigue viendo y sólo el total avisa el error', () => {
    setup(failedSummary);
    render(<SalesAreaCard />);
    expect(screen.getByTestId('grafico')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo calcular el total');
    expect(screen.queryByText(/Sin ventas en este período/)).toBeNull();
  });

  it('con datos muestra el total del back', () => {
    setup({
      data: {
        current: { totalSales: 1234, totalOrders: 3, averageTicket: 411.33 },
        previous: { totalSales: 1000, totalOrders: 2, averageTicket: 500 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<SalesAreaCard />);
    expect(screen.getByText(/1\.234/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
