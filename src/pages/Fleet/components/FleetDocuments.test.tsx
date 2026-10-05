import { cleanup, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FleetTask } from '../../../services/api/types';

const TASKS = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: false }),
}));
vi.mock('../../../services/queries/fleet', () => ({
  useCarDocuments: () => ({ data: { tasks: TASKS.value, isLocked: false }, isPending: false, error: null }),
  useDriverDocuments: () => ({ data: undefined, isPending: false, error: null }),
  useCancelFleetTask: () => ({ mutate: vi.fn() }),
}));
vi.mock('./FleetTaskCloseModal', () => ({ FleetTaskCloseModal: () => null }));
vi.mock('./FleetTaskDetailModal', () => ({ FleetTaskDetailModal: () => null }));
vi.mock('./FleetTaskFormModal', () => ({ FleetTaskFormModal: () => null }));
// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: FleetTask[]; columns: GridColDef<FleetTask>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.taskId}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<FleetTask>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import { FleetDocuments } from './FleetDocuments';

afterEach(cleanup);

const task = (taskId: string, name: string, status: string) =>
  ({
    taskId,
    status,
    plan: { name },
    referenceNumber: null,
    category: null,
    dueAt: null,
    dueKm: null,
  }) as unknown as FleetTask;

const renderDocs = (canWrite: boolean) =>
  render(
    <MemoryRouter>
      <FleetDocuments subject="vehicle" ownerId="c1" canWrite={canWrite} />
    </MemoryRouter>,
  );

describe('FleetDocuments: fila de acciones', () => {
  it('una tarea cerrada no tiene Editar ni menú; la abierta sí', () => {
    TASKS.value = [task('1', 'Seguro', 'open'), task('2', 'VTV', 'done')];
    renderDocs(true);
    expect(screen.getByRole('button', { name: 'Editar Seguro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Más acciones de Seguro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver VTV' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar VTV' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Más acciones de VTV' })).toBeNull();
  });

  it('sin permiso de escritura sólo queda Ver', () => {
    TASKS.value = [task('1', 'Seguro', 'open')];
    renderDocs(false);
    expect(screen.getByRole('button', { name: 'Ver Seguro' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Seguro' })).toBeNull();
  });
});
