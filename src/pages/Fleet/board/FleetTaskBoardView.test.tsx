import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBoard } from './boardFixtures';

const state = vi.hoisted(() => ({
  allowed: true,
  board: null as unknown,
  handler: null as null | ((e: unknown) => void),
}));
type MoveCall = [{ id: string; body: { to: string; scheduledAt?: string; afterId?: string; beforeId?: string } }];
const move = vi.hoisted(() => ({ mutate: vi.fn<MoveCall, void>(), isPending: false }));

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: false, canWrite: true }),
  usePermiso: () => ({ allowed: state.allowed, known: true }),
}));
vi.mock('../../../services/queries/fleet', () => ({
  useFleetTaskBoard: () => ({ data: state.board, isPending: false, error: null, refetch: vi.fn() }),
  useMoveFleetTask: () => move,
  useCancelFleetTask: () => ({ mutate: vi.fn(), isPending: false }),
  useFleetTask: (id?: string) => ({ data: id ? { taskId: id } : undefined }),
  useCreateFleetTask: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateFleetTask: () => ({ mutate: vi.fn(), isPending: false }),
  useFleetPlans: () => ({ data: [], error: null, refetch: vi.fn() }),
}));
vi.mock('../../../services/queries/employees', () => ({ useEmployees: () => ({ data: { rows: [] } }) }));
vi.mock('../components/useFleetOwners', () => ({ useFleetOwners: () => ({ cars: [] }) }));
vi.mock('../components/FleetTaskCloseModal', () => ({
  FleetTaskCloseModal: ({ open }: { open: boolean }) => (open ? <div>cierre abierto</div> : null),
}));
vi.mock('../components/FleetTaskFormModal', () => ({ FleetTaskFormModal: () => null }));
vi.mock('./useFleetTaskBoardEvents', () => ({ useFleetTaskBoardEvents: () => undefined }));

import { FleetTaskBoardView } from './FleetTaskBoardView';

beforeEach(() => {
  state.allowed = true;
  state.board = sampleBoard();
  move.mutate.mockReset();
});
afterEach(cleanup);

const renderView = () =>
  render(
    <MemoryRouter>
      <FleetTaskBoardView />
    </MemoryRouter>,
  );
const col = (name: string) => screen.getByRole('region', { name: `Columna ${name}` });
const dragTo = (title: string, target: HTMLElement, over?: HTMLElement) => {
  const source = screen.getByText(title).closest('li') as HTMLElement;
  fireEvent.dragStart(source);
  if (over) fireEvent.dragOver(over, { clientY: 1000 });
  fireEvent.drop(target);
};

describe('FleetTaskBoardView', () => {
  it('muestra las cuatro columnas con contador y los datos de la tarjeta', () => {
    renderView();
    for (const name of ['Pronosticadas', 'Programadas', 'En curso', 'Hechas (30 días)']) expect(col(name)).toBeTruthy();
    expect(within(col('Pronosticadas')).getByLabelText('2 tareas')).toBeTruthy();
    expect(screen.getByText(/Vencida/)).toBeTruthy();
    expect(screen.getByLabelText('2 adjuntos')).toBeTruthy();
    expect(screen.getAllByText('Pérez, Juan').length).toBeGreaterThan(0);
    expect(screen.getByText(/1 tareas canceladas/)).toBeTruthy();
  });

  it('arrastrar a En curso llama a move con to=in_progress', () => {
    renderView();
    dragTo('Seguro', col('En curso'));
    expect(move.mutate).toHaveBeenCalledTimes(1);
    const { id, body } = move.mutate.mock.calls[0][0];
    expect(id).toBe('f2');
    expect(body).toMatchObject({ to: 'in_progress', afterId: 'i1' });
  });

  it('reordenar dentro de la columna manda afterId', () => {
    renderView();
    const target = screen.getByText('Frenos').closest('li') as HTMLElement;
    dragTo('Service', col('Programadas'), target);
    expect(move.mutate.mock.calls[0][0].body).toMatchObject({ to: 'scheduled', afterId: 's2' });
  });

  it('pasar a Programadas desde Pronosticadas pide el turno antes de mover', () => {
    renderView();
    dragTo('VTV', col('Programadas'));
    expect(move.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Programar turno')).toBeTruthy();
    // sin fecha no avanza
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }));
    expect(screen.getByText('Elegí la fecha y la hora del turno')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Fecha y hora del turno'), { target: { value: '2026-12-02T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }));
    const body = move.mutate.mock.calls[0][0].body;
    expect(body.to).toBe('scheduled');
    expect(body.scheduledAt).toBe(new Date('2026-12-02T10:30').toISOString());
  });

  it('soltar en Hechas abre el cierre y no llama a move', () => {
    renderView();
    dragTo('Cubiertas', col('Hechas (30 días)'));
    expect(screen.getByText('cierre abierto')).toBeTruthy();
    expect(move.mutate).not.toHaveBeenCalled();
  });

  it('el menú «Mover a…» mueve sin arrastrar', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Acciones de Seguro' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Mover a En curso' }));
    expect(move.mutate.mock.calls[0][0].body.to).toBe('in_progress');
  });

  it('sin permiso de gestionar es de sólo lectura', () => {
    state.allowed = false;
    renderView();
    expect(screen.queryByRole('button', { name: 'Nueva tarea' })).toBeNull();
    expect(screen.queryAllByLabelText('Acciones de Seguro')).toHaveLength(0);
    expect(screen.getByText('Seguro').closest('li')?.getAttribute('draggable')).toBe('false');
    dragTo('Seguro', col('En curso'));
    expect(move.mutate).not.toHaveBeenCalled();
    expect(screen.getByText(/Sólo lectura/)).toBeTruthy();
  });

  it('con permiso muestra Nueva tarea', () => {
    renderView();
    expect(screen.getByRole('button', { name: 'Nueva tarea' })).toBeTruthy();
    void act;
  });
});
