import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supplier } from '../../test/fixtures';
import { describeListStates, mutation, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
  canWrite: true,
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
}));
vi.mock('../../common/components/ImportWizard/ImportWizard', () => ({
  ImportWizard: ({ resource }: { resource: string }) => <div role="dialog" aria-label={`Importar ${resource}`} />,
}));
vi.mock('../../services/queries/purchases', () => ({
  useSuppliers: (...args: unknown[]) => state.list(...args) as unknown,
  useUpdateSupplier: () => state.update() as unknown,
  useDeleteSupplier: () => state.remove() as unknown,
}));
vi.mock('../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('./components/SupplierFormModal', () => ({ SupplierFormModal: () => null }));

import { Suppliers } from './Suppliers';

state.update.mockReturnValue(mutation());
state.remove.mockReturnValue(mutation());

describeListStates({
  name: 'Proveedores',
  url: '/purchases/suppliers',
  page: <Suppliers />,
  setResult: (result) => state.list.mockReturnValue(result),
  withRow: () => ok(pageOf([supplier()])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'Gas del Norte SA',
  emptyText: 'Todavía no hay proveedores',
  loadingLabel: 'Cargando proveedores',
});

describe('Suppliers', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.canWrite = true;
    state.update.mockReturnValue(mutation());
    state.remove.mockReturnValue(mutation());
  });

  it('dar de baja confirma y llama a la baja del proveedor', async () => {
    const remove = mutation();
    state.remove.mockReturnValue(remove);
    state.confirm.mockResolvedValue(true);
    state.list.mockReturnValue(ok(pageOf([supplier()])));
    renderPage(<Suppliers />, { url: '/purchases/suppliers' });
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(remove.mutate).toHaveBeenCalled());
    expect(remove.mutate.mock.calls[0][0]).toBe('s-1');
  });

  it('un proveedor dado de baja se reactiva', () => {
    const update = mutation();
    state.update.mockReturnValue(update);
    state.list.mockReturnValue(ok(pageOf([supplier({ isActive: false })])));
    renderPage(<Suppliers />, { url: '/purchases/suppliers?inactive=1' });
    fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }));
    expect(update.mutate.mock.calls[0][0]).toEqual({ id: 's-1', body: { isActive: true } });
  });

  it('la página y los filtros van en la URL', () => {
    state.list.mockReturnValue(ok(pageOf([supplier()], 35)));
    renderPage(<Suppliers />, { url: '/purchases/suppliers?page=3&kind=other' });
    expect(state.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }, expect.objectContaining({ kind: 'other' }));
  });

  it('sin permiso de escritura no hay altas ni bajas', () => {
    state.canWrite = false;
    state.list.mockReturnValue(ok(pageOf([supplier()])));
    renderPage(<Suppliers />, { url: '/purchases/suppliers' });
    expect(screen.getByRole('button', { name: /Nuevo proveedor/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();
  });
});

describe('Suppliers: importación', () => {
  afterEach(cleanup);

  it('el menú «Más» ofrece importar proveedores y abre el asistente', async () => {
    state.list.mockReturnValue(ok(pageOf([supplier()])));
    renderPage(<Suppliers />, { url: '/purchases/suppliers' });
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Importar proveedores' }));
    expect(await screen.findByRole('dialog', { name: 'Importar proveedores' })).toBeInTheDocument();
  });
});
