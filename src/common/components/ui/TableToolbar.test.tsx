import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableToolbar } from './TableToolbar';

const downloadCsv = vi.hoisted(() => vi.fn<[string, string], void>());
vi.mock('../../../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  downloadCsv,
}));

afterEach(() => {
  cleanup();
  downloadCsv.mockClear();
});

describe('TableToolbar', () => {
  it('busca, muestra los filtros y avisa lo que se escribe', () => {
    const onChange = vi.fn();
    render(
      <TableToolbar
        search={{ label: 'Buscar cosas', value: '', onChange }}
        filters={<button type="button">Filtro A</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Filtro A' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar cosas' }), { target: { value: 'ana' } });
    expect(onChange).toHaveBeenCalledWith('ana');
  });

  it('exporta el CSV desde el menú «Más»', async () => {
    render(<TableToolbar csv={{ filename: 'cosas', headers: ['A'], rows: [['1']] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Exportar CSV' }));
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    expect(downloadCsv.mock.calls[0]?.[0]).toMatch(/^cosas-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('sin filas la exportación queda deshabilitada', async () => {
    render(<TableToolbar csv={{ filename: 'cosas', headers: ['A'], rows: [] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(await screen.findByRole('menuitem', { name: 'Exportar CSV' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('sin acciones no hay menú «Más»', () => {
    render(<TableToolbar />);
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument();
  });

  it('con filtros activos muestra los chips; sin ellos, el conteo', () => {
    const onRemove = vi.fn();
    const { rerender } = render(
      <TableToolbar
        chips={[{ key: 'q', label: '"ana"' }]}
        onRemoveChip={onRemove}
        resultCount={3}
        noun={['cliente', 'clientes']}
      />,
    );
    expect(screen.getByText('resultados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro: Búsqueda: "ana"' }));
    expect(onRemove).toHaveBeenCalledWith('q');
    rerender(<TableToolbar resultCount={1} noun={['cliente', 'clientes']} />);
    expect(screen.getByText('1 cliente')).toBeInTheDocument();
  });
});
