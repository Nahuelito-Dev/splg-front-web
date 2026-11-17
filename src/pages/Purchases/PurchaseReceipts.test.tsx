import { cleanup, fireEvent, screen, within } from '@testing-library/react';
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
  usePurchaseReceiptStatusCounts: () => ({ all: 4, confirmed: 3, voided: 1 }),
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

  it('un estado por celda: el de la recepción como etiqueta y el del pago como texto secundario', () => {
    state.list.mockReturnValue(ok(pageOf([receiptSummary({ status: 'voided' })])));
    renderPage(<PurchaseReceipts />, { url: '/purchases/receipts' });
    const card = screen.getByText('N° 21 · Gas del Norte SA').closest('li') as HTMLElement;
    expect(within(card).getByText('Sin pagar')).not.toHaveClass('rounded-full');
    expect(within(card).getByText('Sin pagar')).toHaveClass('text-muted');
    expect(within(card).getByText('Anulada')).toHaveClass('rounded-full', 'h-[22px]');
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
    expect(state.list).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 }, expect.anything(), expect.anything());
  });

  it('un estado inválido en la URL se trata como «todos» en la consulta y en las pestañas', () => {
    state.list.mockReturnValue(ok(pageOf([receiptSummary()])));
    renderPage(<PurchaseReceipts />, { url: '/purchases/receipts?status=inventado' });
    expect(state.list).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ status: undefined }),
      expect.anything(),
    );
    expect(screen.getByRole('tab', { name: /Todos/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('un rango invertido (desde > hasta) no consulta el listado y lo avisa', () => {
    state.list.mockReturnValue(ok(pageOf([])));
    renderPage(<PurchaseReceipts />, { url: '/purchases/receipts?from=2026-10-20&to=2026-10-01' });
    expect(state.list).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), { enabled: false });
    expect(screen.getByText('Es anterior al inicio')).toBeInTheDocument();
  });
});
