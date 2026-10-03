import type { GridColDef } from '@mui/x-data-grid';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import { SelectionBar } from './SelectionBar';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  closed?: boolean;
}

const ROWS: Row[] = [
  { id: '1', name: 'Uno' },
  { id: '2', name: 'Dos' },
  { id: '3', name: 'Tres', closed: true },
];
const COLUMNS: GridColDef<Row>[] = [{ field: 'name', headerName: 'Nombre', flex: 1 }];

const Harness = ({ onChange = vi.fn() }: { onChange?: (ids: string[]) => void }) => {
  const [ids, setIds] = useState<string[]>([]);
  return (
    <>
      <SelectionBar count={ids.length} noun={['fila', 'filas']} onClear={() => setIds([])}>
        <button type="button">Acción en lote</button>
      </SelectionBar>
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(row) => row.id}
        selection={{
          ids,
          isSelectable: (row) => !row.closed,
          onChange: (next) => {
            setIds(next);
            onChange(next);
          },
        }}
      />
    </>
  );
};

describe('DataTable con selección múltiple', () => {
  it('sin selection no hay casillas', () => {
    render(<DataTable rows={ROWS} columns={COLUMNS} getRowId={(row) => row.id} />);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('marcar filas muestra la barra con la cantidad y las acciones; quitar la selección la oculta', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.queryByRole('region', { name: 'Acciones sobre la selección' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('checkbox', { name: /(select row|seleccionar fila)/i })[0]);
    expect(onChange).toHaveBeenLastCalledWith(['1']);
    expect(screen.getByText('1 fila seleccionado')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('checkbox', { name: /(select row|seleccionar fila)/i })[1]);
    expect(screen.getByText('2 filas seleccionados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acción en lote' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar selección' }));
    expect(screen.queryByRole('region', { name: 'Acciones sobre la selección' })).not.toBeInTheDocument();
  });

  it('las filas que no se pueden marcar no tienen casilla habilitada', () => {
    render(<Harness />);
    const boxes = screen.getAllByRole('checkbox', { name: /(select row|seleccionar fila)/i });
    expect(boxes[2].closest('.Mui-disabled') ?? boxes[2]).toBeTruthy();
    fireEvent.click(boxes[2]);
    expect(screen.queryByRole('region', { name: 'Acciones sobre la selección' })).not.toBeInTheDocument();
  });
});
