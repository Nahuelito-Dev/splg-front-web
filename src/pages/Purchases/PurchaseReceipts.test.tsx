import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { receiptSummary } from '../../test/fixtures';
import { describeListStates, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ list: vi.fn(), suppliers: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
}));
vi.mock('../../services/queries/purchases', () => ({
  usePurchaseReceipts: (...args: unknown[]) => state.list(...args) as unknown,
  useSupplierOptions: () => state.suppliers() as unknown,
}));
vi.mock('./components/PurchaseReceiptFormModal', () => ({
  PurchaseReceiptFormModal: ({ open }: { open: boolean }) => (open ? <p>Formulario de recepción</p> : null),
}));

import { PurchaseReceipts } from './PurchaseReceipts';

state.suppliers.mockReturnValue(ok({ data: [], total: 0 }));

describeListStates({
  name: 'Recepciones',
  url: '/purchases/receipts',
  page: <PurchaseReceipts />,
  setResult: (result) => state.list.mockReturnValue(result),
  withRow: () => ok(pageOf([receiptSummary()])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'N° 21 · Gas del Norte SA',
  emptyText: 'Todavía no hay recepciones',
  loadingLabel: 'Cargando recepciones',
});

describe('PurchaseReceipts', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.suppliers.mockReturnValue(ok({ data: [], total: 0 }));
  });

  it('«Compra directa» abre el formulario de compra directa', () => {
    state.list.mockReturnValue(ok(pageOf([receiptSummary()])));
    renderPage(<PurchaseReceipts />, { url: '/purchases/receipts' });
    fireEvent.click(screen.getByRole('button', { name: /Compra directa/ }));
    expect(screen.getByText('Formulario de recepción')).toBeInTheDocument();
  });

  it('la página va en la URL', () => {
    state.list.mockReturnValue(ok(pageOf([receiptSummary()], 45)));
    renderPage(<PurchaseReceipts />, { url: '/purchases/receipts?page=2' });
    expect(state.list).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 }, expect.anything());
  });
});
