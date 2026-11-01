import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ result: undefined as unknown }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../services/queries/fleetExpense', () => ({
  useFleetCosts: () => state.result,
}));

import { FleetCosts } from './FleetCosts';

const row = (carId: string, total: number, km: number) => ({
  carId,
  carPatent: carId.toUpperCase(),
  carBrand: 'Fiat',
  carModel: 'X',
  maintenance: total,
  insurance: 0,
  fuel: 0,
  fines: 0,
  accidents: 0,
  total,
  insuranceEstimated: false,
  km,
  kmSource: km > 0 ? 'usage_log' : 'none',
  costPerKm: km > 0 ? total / km : null,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FleetCosts: los totales los manda el back', () => {
  it('muestra el costo total y el costo por km del resumen, no una suma de los renglones', () => {
    state.result = ok({
      from: '2026-10-01',
      to: '2026-10-31',
      // Los renglones sumarían 3000; el resumen del back dice otra cifra y es la que se ve.
      summary: {
        vehicles: 2,
        maintenance: 0,
        insurance: 0,
        fuel: 0,
        fines: 0,
        accidents: 0,
        total: 91234,
        km: 100,
        costPerKm: 4567.8,
        withoutKm: 1,
      },
      vehicles: [row('a', 1000, 100), row('b', 2000, 0)],
    });
    renderPage(<FleetCosts />, { url: '/fleet/costs' });

    expect(screen.getByText(/91\.234/)).toBeInTheDocument();
    expect(screen.getByText(/4\.568/)).toBeInTheDocument();
    expect(screen.getByText('1 vehículo sin km')).toBeInTheDocument();
  });
});
