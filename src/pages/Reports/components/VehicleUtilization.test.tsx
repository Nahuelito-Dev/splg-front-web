import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as csv from '../../../utils/csv';

const reports = vi.hoisted(() => ({ useVehicleUtilization: vi.fn() }));
vi.mock('../../../services/queries/reports', () => reports);
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  RankBarsChart: () => <div data-testid="vehicle-chart" />,
}));

import { VehicleUtilization } from './VehicleUtilization';
import type { VehicleUtilizationReport, VehicleUtilizationRow } from '../../../services/api/types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const range = { from: '2026-10-01', to: '2026-10-31' };

const row = (extra: Partial<VehicleUtilizationRow> = {}): VehicleUtilizationRow => ({
  vehicleId: 'car-1',
  plate: 'AA123BB',
  name: 'Fiat',
  model: 'Fiorino',
  photo: null,
  daysInUse: 4,
  km: 120,
  deliveries: 8,
  insuranceEstimated: true,
  costs: { fuel: 100, maintenance: 20, insurance: 10, other: 5, total: 135 },
  costPerDelivery: 16.88,
  costPerKm: 1.13,
  ...extra,
});

const report = (
  rows: VehicleUtilizationRow[],
  totals: Partial<VehicleUtilizationReport['totals']> = {},
): VehicleUtilizationReport => ({
  rows,
  totals: {
    vehicles: rows.length,
    daysInUse: 9,
    km: 999,
    deliveries: 33,
    insuranceEstimated: false,
    costs: { fuel: 1, maintenance: 2, insurance: 3, other: 4, total: 123456 },
    costPerDelivery: 1,
    costPerKm: 2,
    ...totals,
  },
});

const respond = (data: VehicleUtilizationReport) =>
  reports.useVehicleUtilization.mockReturnValue({ data, isLoading: false, error: null, refetch: vi.fn() });

describe('VehicleUtilization', () => {
  it('muestra los totales calculados por el back, el gráfico y el costo por km una sola vez, en su columna', () => {
    respond(report([row()]));
    render(<VehicleUtilization range={range} />);
    expect(screen.getByRole('heading', { name: 'Utilización por vehículo' })).toBeInTheDocument();
    expect(screen.getByText('AA123BB')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Costo/km' })).toBeInTheDocument();
    expect(screen.getByText(/^\$\s?1,13$/)).toBeInTheDocument();
    expect(screen.queryByText(/\d\/km$/)).not.toBeInTheDocument();
    expect(screen.getByText(/123\.456/)).toBeInTheDocument();
    expect(screen.getByTestId('vehicle-chart')).toBeInTheDocument();
  });

  it('explica cuando no hay actividad', () => {
    respond(report([]));
    render(<VehicleUtilization range={range} />);
    expect(screen.getByText('Sin uso de vehículos en el período')).toBeInTheDocument();
  });

  it('sin uso ni costos muestra el vacío; con costos y sin uso muestra la tabla', () => {
    const idle = row({
      km: 0,
      deliveries: 0,
      daysInUse: 0,
      costs: { fuel: 0, maintenance: 0, insurance: 0, other: 0, total: 0 },
      costPerDelivery: null,
      costPerKm: null,
    });
    respond(report([idle]));
    const { unmount } = render(<VehicleUtilization range={range} />);
    expect(screen.getByText('Sin uso de vehículos en el período')).toBeInTheDocument();
    unmount();

    respond(report([{ ...idle, costs: { ...idle.costs, insurance: 50, total: 50 } }]));
    render(<VehicleUtilization range={range} />);
    expect(screen.queryByText('Sin uso de vehículos en el período')).not.toBeInTheDocument();
    expect(screen.getByText('AA123BB')).toBeInTheDocument();
    expect(screen.queryByText('Sin km')).not.toBeInTheDocument();
  });

  it('marca el seguro estimado en el detalle y en el total sólo si el back lo informa', () => {
    respond(report([row()], { insuranceEstimated: true }));
    const { unmount } = render(<VehicleUtilization range={range} />);
    expect(screen.getByText('incluye seguro estimado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /AA123BB/ }));
    expect(screen.getByText('Seguro (estimado)')).toBeInTheDocument();
    unmount();

    respond(report([row({ insuranceEstimated: false })], { insuranceEstimated: false }));
    render(<VehicleUtilization range={range} />);
    expect(screen.queryByText('incluye seguro estimado')).not.toBeInTheDocument();
  });

  it('muestra la foto del vehículo en la celda de identidad si viene', () => {
    respond(report([row({ photo: 'https://s3.test/cars/car-1.jpg' })]));
    const { container } = render(<VehicleUtilization range={range} />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://s3.test/cars/car-1.jpg');
  });

  it('el CSV lleva combustible, mantenimiento, seguro (estimado), otros, costo total y los ratios', () => {
    respond(report([row()]));
    const download = vi.spyOn(csv, 'downloadCsv').mockImplementation(() => {});
    render(<VehicleUtilization range={range} />);
    fireEvent.click(screen.getByRole('button', { name: /Exportar Utilización por vehículo a CSV/ }));
    const content = download.mock.calls[0]?.[1] ?? '';
    const [header, line] = content.split('\n');
    expect(header).toBe(
      'Vehículo;Días;Km;Entregas;Costo total;Costo/entrega;Costo/km;Combustible;Mantenimiento;Seguro;Seguro estimado;Otros',
    );
    expect(line).toBe('AA123BB;4;120;8;135;16,88;1,13;100;20;10;Sí;5');
  });
});
