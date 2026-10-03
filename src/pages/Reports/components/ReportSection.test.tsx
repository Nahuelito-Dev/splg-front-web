import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as csv from '../../../utils/csv';
import { ReportSection } from './ReportSection';
import type { ReportColumn } from './ReportTable';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

interface Row {
  id: string;
  name: string;
  sales: number;
}

const columns: ReportColumn<Row>[] = [
  { header: 'Nombre', render: (r) => r.name, csv: (r) => r.name },
  { header: 'Ventas', numeric: true, render: (r) => `$ ${r.sales}`, csv: (r) => r.sales, total: '$ 300' },
];
const rows: Row[] = [
  { id: 'a', name: 'Ana', sales: 100 },
  { id: 'b', name: 'Beto, el chofer', sales: 200 },
];

const base = {
  title: 'Ventas por chofer',
  description: 'desc',
  fileName: 'choferes',
  columns,
  getKey: (r: Row) => r.id,
  chart: <div>grafico</div>,
  error: null,
  onRetry: vi.fn(),
};

describe('ReportSection', () => {
  it('muestra el gráfico, la tabla y la fila de totales', () => {
    render(<ReportSection {...base} rows={rows} loading={false} />);
    expect(screen.getByText('grafico')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('$ 300')).toBeInTheDocument();
  });

  it('exporta a CSV separado por punto y coma, con los datos escapados', () => {
    const download = vi.spyOn(csv, 'downloadCsv').mockImplementation(() => {});
    render(<ReportSection {...base} rows={rows} loading={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Ventas por chofer a CSV' }));
    expect(download).toHaveBeenCalledWith('choferes.csv', 'Nombre;Ventas\nAna;100\nBeto, el chofer;200');
  });

  it('vacío: avisa y no deja exportar', () => {
    render(<ReportSection {...base} rows={[]} loading={false} />);
    expect(screen.getByText('Sin ventas en el período')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar/ })).toBeDisabled();
  });

  it('cargando: muestra el esqueleto, sin tabla', () => {
    render(<ReportSection {...base} rows={[]} loading />);
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('error: ofrece reintentar', () => {
    const onRetry = vi.fn();
    render(<ReportSection {...base} rows={[]} loading={false} error={new Error('boom')} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
