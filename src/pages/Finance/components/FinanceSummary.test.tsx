import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FinanceDashboard } from '../../../services/api/types';

const dashboard = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/finance', () => ({
  useFinanceDashboard: (date?: string) => dashboard(date) as unknown,
}));

import { FinanceSummary } from './FinanceSummary';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const DATA = {
  date: '2026-10-15',
  cashBoxes: [{}, {}],
  totalBalance: 150000,
  movements: { income: 20000, expense: 5000, count: 7 },
  settlements: { open: 2, submitted: 3, approved: 1, overdue: 1, pendingCash: 90000 },
  receivables: { totalDebt: 80000, overdueDebt: 30000, accountsWithDebt: 4 },
  commissions: { pendingToLiquidate: 12000, employees: 3 },
} as unknown as FinanceDashboard;

describe('FinanceSummary', () => {
  it('cajas: saldo total y cantidad de cajas del tablero', () => {
    dashboard.mockReturnValue({ data: DATA, isPending: false, isError: false });
    render(<FinanceSummary kind="boxes" />);
    expect(screen.getByText('Saldo en cajas')).toBeInTheDocument();
    expect(screen.getByText('$ 150.000')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('rendiciones: pide el día del listado y avisa las atrasadas', () => {
    dashboard.mockReturnValue({ data: DATA, isPending: false, isError: false });
    render(<FinanceSummary kind="settlements" date="2026-10-15" />);
    expect(dashboard).toHaveBeenCalledWith('2026-10-15');
    expect(screen.getByText('$ 90.000')).toBeInTheDocument();
    expect(screen.getByText('1 atrasadas')).toBeInTheDocument();
  });

  it('cuentas: deuda total y vencida', () => {
    dashboard.mockReturnValue({ data: DATA, isPending: false, isError: false });
    render(<FinanceSummary kind="accounts" />);
    expect(screen.getByText('$ 80.000')).toBeInTheDocument();
    expect(screen.getByText('$ 30.000')).toBeInTheDocument();
  });

  it('con error del tablero no dibuja nada', () => {
    dashboard.mockReturnValue({ data: undefined, isPending: false, isError: true });
    const { container } = render(<FinanceSummary kind="movements" />);
    expect(container).toBeEmptyDOMElement();
  });
});
