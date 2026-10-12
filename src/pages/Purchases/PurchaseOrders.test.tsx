import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderSummary } from '../../test/fixtures';
import { describeListStates, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ list: vi.fn(), suppliers: vi.fn(), canWrite: true }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
}));
vi.mock('../../services/queries/purchases', () => ({
  usePurchaseOrders: (...args: unknown[]) => state.list(...args) as unknown,
  useSupplierOptions: () => state.suppliers() as unknown,
}));
vi.mock('./components/PurchaseOrderFormModal', () => ({
  PurchaseOrderFormModal: ({ open }: { open: boolean }) => (open ? <p>Formulario de orden</p> : null),
}));

import { PurchaseOrders } from './PurchaseOrders';

state.suppliers.mockReturnValue(ok({ data: [], total: 0 }));

describeListStates({
  name: 'Órdenes de compra',
  url: '/purchases/orders',
  page: <PurchaseOrders />,
  setResult: (result) => state.list.mockReturnValue(result),
  withRow: () => ok(pageOf([orderSummary()])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'N° 12 · Gas del Norte SA',
  emptyText: 'Todavía no hay órdenes de compra',
  loadingLabel: 'Cargando órdenes',
});

describe('PurchaseOrders', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.canWrite = true;
    state.suppliers.mockReturnValue(ok({ data: [], total: 0 }));
  });

  it('muestra cuánto se recibió de lo pedido', () => {
    state.list.mockReturnValue(ok(pageOf([orderSummary()])));
    renderPage(<PurchaseOrders />, { url: '/purchases/orders' });
    expect(screen.getByText(/4 de 10 recibidas/)).toBeInTheDocument();
  });

  it('«Nueva orden» abre el formulario', () => {
    state.list.mockReturnValue(ok(pageOf([orderSummary()])));
    renderPage(<PurchaseOrders />, { url: '/purchases/orders' });
    fireEvent.click(screen.getByRole('button', { name: /Nueva orden/ }));
    expect(screen.getByText('Formulario de orden')).toBeInTheDocument();
  });

  it('la página va en la URL y un filtro vuelve a la primera', () => {
    state.list.mockReturnValue(ok(pageOf([orderSummary()], 45)));
    renderPage(<PurchaseOrders />, { url: '/purchases/orders?page=4' });
    expect(state.list).toHaveBeenLastCalledWith({ page: 3, pageSize: 10 }, expect.anything());
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'sent' } });
    expect(state.list).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, expect.objectContaining({ status: 'sent' }));
  });

  it('sin permiso de escritura no se puede crear', () => {
    state.canWrite = false;
    state.list.mockReturnValue(ok(pageOf([orderSummary()])));
    renderPage(<PurchaseOrders />, { url: '/purchases/orders' });
    expect(screen.getByRole('button', { name: /Nueva orden/ })).toBeDisabled();
  });
});
