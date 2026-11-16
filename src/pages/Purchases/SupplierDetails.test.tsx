import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { receiptSummary, supplier } from '../../test/fixtures';
import { presetRange } from '../../utils/dateRange';
import { failed, loading, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ supplier: vi.fn(), history: vi.fn(), canWrite: true }));

// La foto se pide aparte (v2) y tiene sus propios tests: acá no hace falta.
vi.mock('../../common/components/ui/EntityPhoto', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  LinkedEntityPhoto: () => null,
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/purchases', () => ({
  useSupplier: () => state.supplier() as unknown,
  useSupplierHistory: (...args: unknown[]) => state.history(...args) as unknown,
}));
vi.mock('./components/SupplierFormModal', () => ({
  SupplierFormModal: ({ open }: { open: boolean }) => (open ? <p>Formulario de proveedor</p> : null),
}));

import { SupplierDetails } from './SupplierDetails';

const HISTORY = {
  supplierId: 's-1',
  supplierName: 'Gas del Norte SA',
  receiptsCount: 3,
  totalAmount: 360000,
  fullReceived: 30,
  data: [receiptSummary()],
  total: 1,
};

const draw = (url = '/purchases/suppliers/s-1') =>
  renderPage(<SupplierDetails />, { url, path: '/purchases/suppliers/:id' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.canWrite = true;
});

describe('SupplierDetails', () => {
  it('muestra los datos del proveedor, los totales y el historial', () => {
    state.supplier.mockReturnValue(ok(supplier()));
    state.history.mockReturnValue(ok(HISTORY));
    draw();
    expect(screen.getByRole('heading', { name: 'Gas del Norte SA' })).toBeInTheDocument();
    expect(screen.getByText('Recepción N° 21')).toBeInTheDocument();
    expect(screen.getByText('Recepciones')).toBeInTheDocument();
  });

  it('el rango de fechas de la URL viaja al historial y la página va en la URL', () => {
    state.supplier.mockReturnValue(ok(supplier()));
    state.history.mockReturnValue(ok({ ...HISTORY, total: 30 }));
    draw('/purchases/suppliers/s-1?from=2026-10-01&to=2026-10-31&page=2');
    expect(state.history).toHaveBeenLastCalledWith(
      's-1',
      { page: 1, pageSize: 10 },
      { from: '2026-10-01', to: '2026-10-31' },
    );
  });

  it('elegir un período filtra el historial y vuelve a la primera página', () => {
    state.supplier.mockReturnValue(ok(supplier()));
    state.history.mockReturnValue(ok({ ...HISTORY, total: 30 }));
    draw('/purchases/suppliers/s-1?page=3');
    fireEvent.click(screen.getByRole('button', { name: /Fechas:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 7 días' }));
    const week = presetRange('last7');
    expect(state.history).toHaveBeenLastCalledWith('s-1', { page: 0, pageSize: 10 }, week);
  });

  it('con un período sin compras no dice que nunca se le compró', () => {
    state.supplier.mockReturnValue(ok(supplier()));
    state.history.mockReturnValue(ok({ ...HISTORY, data: [], total: 0 }));
    draw('/purchases/suppliers/s-1?from=2026-10-01');
    expect(screen.getByText('Sin compras en ese período')).toBeInTheDocument();
    expect(screen.queryByText('Todavía no se le compró nada')).not.toBeInTheDocument();
  });

  it('sin compras y sin filtro dice que todavía no se le compró nada', () => {
    state.supplier.mockReturnValue(ok(supplier()));
    state.history.mockReturnValue(ok({ ...HISTORY, data: [], total: 0 }));
    draw();
    expect(screen.getByText('Todavía no se le compró nada')).toBeInTheDocument();
  });

  it('un error del historial se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.supplier.mockReturnValue(ok(supplier()));
    state.history.mockReturnValue(failed(refetch));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('un error del proveedor se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.supplier.mockReturnValue(failed(refetch));
    state.history.mockReturnValue(loading());
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('«Editar» abre el formulario, y sin permiso está apagado', () => {
    state.supplier.mockReturnValue(ok(supplier()));
    state.history.mockReturnValue(ok(HISTORY));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByText('Formulario de proveedor')).toBeInTheDocument();
    cleanup();
    state.canWrite = false;
    draw();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled();
  });
});
