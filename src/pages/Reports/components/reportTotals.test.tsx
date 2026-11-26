import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const reports = vi.hoisted(() => ({
  useReportsDriverSales: vi.fn(),
  useSalesByPayment: vi.fn(),
  useSalesByProduct: vi.fn(),
}));
vi.mock('../../../services/queries/reports', () => reports);
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  RankBarsChart: () => <div>grafico</div>,
  ShareDonutChart: () => <div>grafico</div>,
}));

import { DriverSales } from './DriverSales';
import { PaymentSales } from './PaymentSales';
import { ProductSales } from './ProductSales';

afterEach(cleanup);

const range = { from: '2026-10-01', to: '2026-10-31' };
const state = (data: unknown) => ({ data, isLoading: false, error: null, refetch: vi.fn() });
const footer = () => {
  const row = screen.getAllByRole('row').at(-1) as HTMLElement;
  return within(row);
};

// Los totales del back no coinciden a propósito con la suma de las filas: el panel tiene que mostrar los del back.
describe('los reportes muestran los totales que manda el back', () => {
  it('ventas por chofer', () => {
    reports.useReportsDriverSales.mockReturnValue(
      state({
        rows: [{ driverId: 'a', driverName: 'Ana', totalOrders: 1, totalSales: 100 }],
        totals: { totalOrders: 7, totalSales: 99999 },
      }),
    );
    render(<DriverSales range={range} />);
    expect(footer().getByText('7')).toBeInTheDocument();
    expect(footer().getByText(/99\.999/)).toBeInTheDocument();
  });

  it('ventas por medio de pago', () => {
    reports.useSalesByPayment.mockReturnValue(
      state({
        rows: [{ method: 'cash', totalOrders: 1, totalSales: 100 }],
        totals: { totalOrders: 8, totalSales: 88888 },
      }),
    );
    render(<PaymentSales range={range} />);
    expect(footer().getByText('8')).toBeInTheDocument();
    expect(footer().getByText(/88\.888/)).toBeInTheDocument();
  });

  it('ventas por producto', () => {
    reports.useSalesByProduct.mockReturnValue(
      state({
        rows: [{ productType: '10kg', description: null, totalQuantity: 1, totalSales: 100 }],
        totals: { totalQuantity: 9, totalSales: 77777 },
      }),
    );
    render(<ProductSales range={range} />);
    expect(footer().getByText('9')).toBeInTheDocument();
    expect(footer().getByText(/77\.777/)).toBeInTheDocument();
  });
});
