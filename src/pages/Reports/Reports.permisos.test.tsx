import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reports } from './Reports';

const state = vi.hoisted(() => ({ flota: true }));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePermiso: (code: string) => ({ allowed: code === 'flota.ver' ? state.flota : true, known: true }),
  usePermissions: () => ({ operateHint: null, canOperate: true }),
}));
vi.mock('./components/SummaryCards', () => ({ SummaryCards: () => null }));
vi.mock('./components/CollectionsCards', () => ({ CollectionsCards: () => null }));
vi.mock('./components/SalesTrend', () => ({ SalesTrend: () => null }));
vi.mock('./components/ProductSales', () => ({ ProductSales: () => null }));
vi.mock('./components/DriverSales', () => ({ DriverSales: () => null }));
vi.mock('./components/PaymentSales', () => ({ PaymentSales: () => null }));
vi.mock('./components/VehicleUtilization', () => ({
  VehicleUtilization: () => <p>Utilización por vehículo</p>,
}));

const renderReports = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('Reportes: utilización por vehículo y el permiso de flota', () => {
  beforeEach(() => {
    state.flota = true;
  });
  afterEach(cleanup);

  it('con flota.ver se ve la sección', () => {
    renderReports();
    expect(screen.getByText('Utilización por vehículo')).toBeInTheDocument();
  });

  it('sin flota.ver no se muestra (los costos son de flota)', () => {
    state.flota = false;
    renderReports();
    expect(screen.queryByText('Utilización por vehículo')).not.toBeInTheDocument();
  });
});
