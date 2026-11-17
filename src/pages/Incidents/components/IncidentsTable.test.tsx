import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Incident } from '../../../services/api/types';

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: Incident[]; columns: GridColDef<Incident>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.incident_id}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<Incident>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import { IncidentsTable } from './IncidentsTable';

afterEach(cleanup);

const incident = (id: string, status: Incident['status']) =>
  ({ incident_id: id, order_id: `order-${id}000000`, status, type: 'other', description: 'x' }) as unknown as Incident;

describe('IncidentsTable: acciones por estado', () => {
  it('una abierta se ve, se edita y se descarta (baja lógica)', () => {
    const onEdit = vi.fn();
    const onDiscard = vi.fn();
    render(
      <IncidentsTable
        rows={[incident('a', 'open')]}
        loading={false}
        onView={vi.fn()}
        onEdit={onEdit}
        onDiscard={onDiscard}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Editar incidencia/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Más acciones de incidencia/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Descartar' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('una resuelta o descartada sólo se ve: la API no deja tocarla', () => {
    render(
      <IncidentsTable
        rows={[incident('b', 'resolved'), incident('c', 'discarded')]}
        loading={false}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: /^Ver incidencia/ })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^Editar incidencia/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Más acciones de incidencia/ })).toBeNull();
  });
});

describe('IncidentsTable: cobro impago', () => {
  it('una incidencia de cobro impago abierta se descarta pero no se edita (la abre el sistema)', () => {
    render(
      <IncidentsTable
        rows={[{ ...incident('u', 'open'), type: 'unpaid_collection' }]}
        loading={false}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByText('Cobro impago')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar incidencia/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Más acciones de incidencia/ }));
    expect(screen.getByRole('menuitem', { name: 'Descartar' })).toBeInTheDocument();
  });
});

describe('IncidentsTable: impago sin resolver', () => {
  it('no se descarta mientras el pedido siga impago (se resuelve el cobro)', () => {
    render(
      <IncidentsTable
        rows={[
          {
            ...incident('w', 'open'),
            type: 'unpaid_collection',
            order: { paymentStatus: 'unpaid' },
          } as unknown as Incident,
        ]}
        loading={false}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    const more = screen.queryByRole('button', { name: /^Más acciones de incidencia/ });
    if (more) fireEvent.click(more);
    expect(screen.queryByRole('menuitem', { name: 'Descartar' })).toBeNull();
  });
});
