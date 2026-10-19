import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExportCsvButton } from './ExportCsvButton';

const download = vi.hoisted(() => vi.fn());
vi.mock('../../../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  downloadCsv: download,
}));

afterEach(() => {
  cleanup();
  download.mockClear();
});

describe('ExportCsvButton', () => {
  it('descarga el CSV con encabezado, filas y la fecha en el nombre', () => {
    render(<ExportCsvButton filename="pedidos" headers={['Cliente', 'Total']} rows={[['Ana', 1500]]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(download).toHaveBeenCalledTimes(1);
    const [name, content] = download.mock.calls[0] as [string, string];
    expect(name).toMatch(/^pedidos-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(content).toBe('Cliente;Total\nAna;1500');
  });

  it('queda deshabilitado sin filas', () => {
    render(<ExportCsvButton filename="pedidos" headers={['Cliente']} rows={[]} />);
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });
});
