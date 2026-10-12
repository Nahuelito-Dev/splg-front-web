import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  confirm: vi.fn(),
  canWrite: true,
  needsDistributor: false,
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    needsDistributor: state.needsDistributor,
    canWrite: state.canWrite,
    writeHint: state.canWrite ? undefined : 'Elegí una distribuidora',
  }),
}));
vi.mock('../../services/queries/employees', () => ({
  useJobPositions: (...args: unknown[]) => state.list(...args) as unknown,
  useUpdateJobPosition: () => state.update() as unknown,
  useDeleteJobPosition: () => state.remove() as unknown,
}));
vi.mock('../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('./components/JobPositionFormModal', () => ({
  JobPositionFormModal: ({ open, position }: { open: boolean; position: { name: string } | null }) =>
    open ? <p>{position ? `Editar ${position.name}` : 'Nuevo puesto (formulario)'}</p> : null,
}));

import { JobPositions } from './JobPositions';

const PUESTO = { positionId: 'p-1', name: 'Chofer de reparto', category: 'driver', isActive: true, activeEmployees: 3 };

state.remove.mockReturnValue(mutation());
state.update.mockReturnValue(mutation());

describeListStates({
  name: 'Puestos',
  url: '/employees/positions',
  page: <JobPositions />,
  setResult: (result) => state.list.mockReturnValue(result),
  withRow: () => ok([PUESTO]),
  withoutRows: () => ok([]),
  rowText: 'Chofer de reparto',
  emptyText: 'Todavía no hay puestos',
  loadingLabel: 'Cargando puestos',
});

describe('JobPositions', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.canWrite = true;
    state.remove.mockReturnValue(mutation());
    state.update.mockReturnValue(mutation());
    state.needsDistributor = false;
  });

  it('muestra la categoría y cuánta gente activa tiene', () => {
    state.list.mockReturnValue(ok([PUESTO]));
    renderPage(<JobPositions />, { url: '/employees/positions' });
    expect(screen.getByText('Choferes')).toBeInTheDocument();
    expect(screen.getByText('3 personas activas')).toBeInTheDocument();
  });

  it('«Nuevo puesto» y «Editar» abren el formulario', () => {
    state.list.mockReturnValue(ok([PUESTO]));
    renderPage(<JobPositions />, { url: '/employees/positions' });
    fireEvent.click(screen.getByRole('button', { name: /Nuevo puesto/ }));
    expect(screen.getByText('Nuevo puesto (formulario)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByText('Editar Chofer de reparto')).toBeInTheDocument();
  });

  it('«Dar de baja» desactiva el puesto (PATCH isActive:false), no lo borra; cancelar no hace nada', async () => {
    const update = mutation();
    const remove = mutation();
    state.update.mockReturnValue(update);
    state.remove.mockReturnValue(remove);
    state.list.mockReturnValue(ok([PUESTO]));
    state.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderPage(<JobPositions />, { url: '/employees/positions' });
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(update.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toEqual({ id: 'p-1', body: { isActive: false } });
    expect(remove.mutate).not.toHaveBeenCalled();
  });

  it('un puesto dado de baja se puede reactivar', () => {
    const update = mutation();
    state.update.mockReturnValue(update);
    state.list.mockReturnValue(ok([{ ...PUESTO, isActive: false }]));
    renderPage(<JobPositions />, { url: '/employees/positions' });
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(update.mutate.mock.calls[0][0]).toEqual({ id: 'p-1', body: { isActive: true } });
  });

  it('«Eliminar» es una acción aparte, sólo sin personal activo, y el confirm explica las reglas', async () => {
    const remove = mutation();
    state.remove.mockReturnValue(remove);
    state.confirm.mockResolvedValue(true);
    state.list.mockReturnValue(ok([PUESTO]));
    renderPage(<JobPositions />, { url: '/employees/positions' });
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    cleanup();
    state.list.mockReturnValue(ok([{ ...PUESTO, activeEmployees: 0 }]));
    renderPage(<JobPositions />, { url: '/employees/positions' });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(remove.mutate).toHaveBeenCalled());
    expect(remove.mutate.mock.calls[0][0]).toBe('p-1');
    expect(JSON.stringify((state.confirm.mock.calls as unknown[][])[0][0])).toMatch(/egresados/);
  });

  it('con una baja en curso no se manda otra (doble clic)', async () => {
    const update = mutation({ isPending: true });
    state.update.mockReturnValue(update);
    state.confirm.mockResolvedValue(true);
    state.list.mockReturnValue(ok([PUESTO]));
    renderPage(<JobPositions />, { url: '/employees/positions' });
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await Promise.resolve();
    expect(state.confirm).not.toHaveBeenCalled();
    expect(update.mutate).not.toHaveBeenCalled();
  });

  it('un administrador general sin distribuidora elegida ve el aviso y no consulta', () => {
    state.needsDistributor = true;
    state.list.mockReturnValue({ ...ok(undefined), data: undefined, isPending: false });
    renderPage(<JobPositions />, { url: '/employees/positions' });
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(state.list).toHaveBeenCalledWith(false);
  });

  it('sin permiso de escritura no hay altas ni ediciones', () => {
    state.canWrite = false;
    state.list.mockReturnValue(ok([PUESTO]));
    renderPage(<JobPositions />, { url: '/employees/positions' });
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Nuevo puesto/ }));
    expect(screen.queryByText('Nuevo puesto (formulario)')).not.toBeInTheDocument();
  });
});
