import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok, renderPage } from '../../test/pageTest';
import { currentMonth, shiftMonth } from './platformRules';

const state = vi.hoisted(() => ({ usage: undefined as unknown, month: vi.fn() }));
vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../services/queries/platformConsole', () => ({
  useDocumentReadingUsage: (month: unknown) => {
    state.month(month);
    return state.usage;
  },
}));

import { ServiceUsage } from './ServiceUsage';

const usage = (items = [row()]) => ok({ month: '2026-11', items, totalReadings: 14, totalCostUsd: 0.2453 });
function row(over: Record<string, unknown> = {}) {
  return {
    distributorId: 'c1',
    name: 'Distribuidora Demo',
    readings: 14,
    costUsd: 0.2453,
    monthlyBudgetUsd: 2,
    enabled: true,
    budgetUsedPct: 12.27,
    ...over,
  };
}

beforeEach(() => {
  state.usage = usage();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Uso y costo de servicios', () => {
  it('carga de pantalla entera mientras no responde', () => {
    state.usage = loading();
    renderPage(<ServiceUsage />, { url: '/platform/service-usage' });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el uso…');
  });

  it('sin empresas muestra el vacío', () => {
    state.usage = usage([]);
    renderPage(<ServiceUsage />, { url: '/platform/service-usage' });
    expect(screen.getByText('Sin empresas')).toBeInTheDocument();
  });

  it('un error se dice y permite reintentar', () => {
    const refetch = vi.fn();
    state.usage = failed(refetch);
    renderPage(<ServiceUsage />, { url: '/platform/service-usage' });
    expect(screen.queryByText('Sin empresas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('el mes de la URL viaja a la API', () => {
    renderPage(<ServiceUsage />, { url: '/platform/service-usage?month=2026-09' });
    expect(state.month).toHaveBeenLastCalledWith('2026-09');
    expect(screen.getByText('Septiembre de 2026')).toBeInTheDocument();
  });

  it('muestra lo que da la API: lecturas, costo y % del tope', () => {
    renderPage(<ServiceUsage />, { url: '/platform/service-usage' });
    expect(screen.getByText('12,27 % del tope de USD 2,00')).toBeInTheDocument();
    expect(screen.getByText('Encendido')).toBeInTheDocument();
  });

  it('una empresa que pasó el tope se destaca', () => {
    state.usage = usage([row({ budgetUsedPct: 104.5 })]);
    renderPage(<ServiceUsage />, { url: '/platform/service-usage' });
    expect(screen.getByText(/104,5 % del tope/)).toHaveClass('text-danger');
  });

  it('arranca en el mes en curso, va al anterior y no deja pasar del actual', () => {
    renderPage(<ServiceUsage />, { url: '/platform/service-usage' });
    const month = currentMonth();
    expect(state.month).toHaveBeenLastCalledWith(month);
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(state.month).toHaveBeenLastCalledWith(shiftMonth(month, -1));
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeEnabled();
  });
});
