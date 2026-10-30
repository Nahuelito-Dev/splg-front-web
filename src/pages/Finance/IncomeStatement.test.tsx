import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  result: undefined as unknown,
  filters: undefined as unknown,
  enabled: undefined as unknown,
  exported: undefined as unknown,
}));

vi.mock('../../hooks/useServerExport', () => ({
  useServerExport: (config: unknown) => {
    state.exported = config;
    return [];
  },
}));
vi.mock('../../services/queries/finance', () => ({
  useCashBoxOptions: () => ok(pageOf([{ cashBoxId: 'c-1', name: 'Caja central' }])),
  useIncomeStatement: (filters: unknown, enabled: unknown) => {
    state.filters = filters;
    state.enabled = enabled;
    return state.result;
  },
}));
vi.mock('./components/IncomeExpenseChart', () => ({
  IncomeExpenseChart: ({ data }: { data: unknown[] }) => <p>Gráfico de {data.length} períodos</p>,
}));

import { IncomeStatement } from './IncomeStatement';

const DATA = {
  from: '2026-10-01',
  to: '2026-10-30',
  groupBy: 'day',
  totals: { income: 1000, expense: 400, net: 600 },
  byCategory: [
    {
      categoryId: 'k-in',
      name: 'Cobro de pedido',
      systemCode: 'order_payment',
      direction: 'in',
      amount: 1000,
      count: 4,
    },
    { categoryId: 'k-out', name: 'Combustible', systemCode: 'fuel', direction: 'out', amount: 400, count: 1 },
  ],
  byPeriod: [
    { period: '2026-10-01', income: 1000, expense: 0, net: 1000 },
    { period: '2026-10-02', income: 0, expense: 400, net: -400 },
  ],
  byCashBox: [{ cashBoxId: 'c-1', name: 'Caja central', kind: 'cash', income: 1000, expense: 400 }],
};

const setup = (result: unknown = ok(DATA), url = '/finance/income-statement') => {
  state.result = result;
  renderPage(<IncomeStatement />, { url });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('IncomeStatement', () => {
  it('muestra los totales, el gráfico, las categorías con su porcentaje y las cajas', () => {
    setup();
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Resultado de caja')).toBeInTheDocument();
    expect(screen.getByText('Superávit')).toBeInTheDocument();
    expect(screen.getByText('Gráfico de 2 períodos')).toBeInTheDocument();
    expect(screen.getByText(/4 movimientos · 100 %/)).toBeInTheDocument();
    expect(screen.getByText(/1 movimiento · 100 %/)).toBeInTheDocument();
    expect(screen.getAllByText('Caja central').length).toBeGreaterThan(0);
  });

  it('cada categoría lleva a los movimientos de ese período y esa categoría', () => {
    setup(ok(DATA), '/finance/income-statement?period=custom&from=2026-10-01&to=2026-10-30&cashBoxId=c-1');
    const link = screen.getByRole('link', { name: 'Ver los movimientos de Combustible' });
    expect(link).toHaveAttribute(
      'href',
      '/finance/movements?categoryId=k-out&direction=out&from=2026-10-01&to=2026-10-30&countsForResult=true&cashBoxId=c-1',
    );
  });

  it('pide a la API el período elegido y exporta con los mismos filtros', () => {
    setup(ok(DATA), '/finance/income-statement?period=custom&from=2026-09-01&to=2026-10-30');
    expect(state.filters).toEqual({ from: '2026-09-01', to: '2026-10-30', groupBy: 'week', cashBoxId: undefined });
    expect(state.exported).toMatchObject({ resource: 'income-statement', params: state.filters });
    fireEvent.click(screen.getByRole('button', { name: 'Este año' }));
    expect(screen.getByRole('button', { name: 'Este año' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('una agrupación inválida en la URL cae en automático', () => {
    setup(ok(DATA), '/finance/income-statement?period=custom&from=2026-10-01&to=2026-10-10&groupBy=year');
    expect((state.filters as { groupBy: string }).groupBy).toBe('day');
    expect(screen.getByLabelText('Agrupar')).toHaveValue('');
  });

  it('un rango de más de 366 días no consulta y avisa', () => {
    setup(ok(DATA), '/finance/income-statement?period=custom&from=2025-01-01&to=2026-10-30');
    expect(state.enabled).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent('366');
    expect((state.exported as { blockedReason: string }).blockedReason).toContain('366');
  });

  it('sin movimientos muestra el estado vacío', () => {
    setup(ok({ ...DATA, totals: { income: 0, expense: 0, net: 0 }, byCategory: [], byCashBox: [] }));
    expect(screen.getByText('Sin movimientos en este período')).toBeInTheDocument();
  });

  it('cargando y con error', () => {
    setup(loading());
    expect(screen.getByText('Calculando ingresos y egresos…')).toBeInTheDocument();
    cleanup();
    setup(failed());
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
