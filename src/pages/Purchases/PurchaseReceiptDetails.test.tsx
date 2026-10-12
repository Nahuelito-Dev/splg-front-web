import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { receiptSummary } from '../../test/fixtures';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ receipt: vi.fn(), payment: vi.fn(), confirm: vi.fn(), canWrite: true }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../common/components/AttachmentsPanel', () => ({
  AttachmentsPanel: ({
    ownerType,
    ownerId,
    canWrite,
    title,
  }: {
    ownerType: string;
    ownerId: string;
    canWrite: boolean;
    title: string;
  }) => (
    <p>
      {title}: {ownerType} {ownerId} {canWrite ? 'con subida' : 'sólo lectura'}
    </p>
  ),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/purchases', () => ({
  usePurchaseReceipt: () => state.receipt() as unknown,
  useUpdateReceiptPaymentStatus: () => state.payment() as unknown,
}));
vi.mock('../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('./components/VoidReceiptModal', () => ({
  VoidReceiptModal: ({ receipt }: { receipt: unknown }) => (receipt ? <p>Anular recepción</p> : null),
}));

import { PurchaseReceiptDetails } from './PurchaseReceiptDetails';

const RECEIPT = (over: Record<string, unknown> = {}) => ({
  ...receiptSummary(),
  notes: null,
  voidReason: null,
  voidedAt: null,
  items: [
    {
      itemId: 'i-1',
      gasCylinderId: 'g-1',
      gasCylinderType: '10kg',
      quantityFull: 10,
      quantityEmptyOut: 8,
      unitCost: 5000,
      subtotal: 50000,
    },
  ],
  ...over,
});

const draw = () =>
  renderPage(<PurchaseReceiptDetails />, { url: '/purchases/receipts/r-1', path: '/purchases/receipts/:id' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.canWrite = true;
});

describe('PurchaseReceiptDetails', () => {
  it('muestra el panel de adjuntos «Foto del remito» atado a la recepción', () => {
    state.receipt.mockReturnValue(ok(RECEIPT()));
    state.payment.mockReturnValue(mutation());
    draw();
    expect(screen.getByText('Foto del remito: purchase_receipt r-1 con subida')).toBeInTheDocument();
  });

  it('sin permiso de escritura el panel de adjuntos es sólo lectura', () => {
    state.canWrite = false;
    state.receipt.mockReturnValue(ok(RECEIPT()));
    state.payment.mockReturnValue(mutation());
    draw();
    expect(screen.getByText(/sólo lectura/)).toBeInTheDocument();
  });

  it('muestra el documento, el total y los renglones', () => {
    state.receipt.mockReturnValue(ok(RECEIPT()));
    state.payment.mockReturnValue(mutation());
    draw();
    expect(screen.getByRole('heading', { name: 'Recepción N° 21' })).toBeInTheDocument();
    expect(screen.getByText('Compra directa')).toBeInTheDocument();
    expect(screen.getByText(/10 llenas · 8 vacías a la planta/)).toBeInTheDocument();
  });

  it('marcar pagada confirma y manda el estado', async () => {
    const payment = mutation();
    state.receipt.mockReturnValue(ok(RECEIPT()));
    state.payment.mockReturnValue(payment);
    state.confirm.mockResolvedValue(true);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar pagada' }));
    await waitFor(() => expect(payment.mutate).toHaveBeenCalled());
    expect(payment.mutate.mock.calls[0][0]).toEqual({ id: 'r-1', body: { paymentStatus: 'paid' } });
  });

  it('una recepción pagada no se puede anular', () => {
    state.receipt.mockReturnValue(ok(RECEIPT({ paymentStatus: 'paid' })));
    state.payment.mockReturnValue(mutation());
    draw();
    expect(screen.getByRole('button', { name: /Anular/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('anular abre el motivo', () => {
    state.receipt.mockReturnValue(ok(RECEIPT()));
    state.payment.mockReturnValue(mutation());
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
    expect(screen.getByText('Anular recepción')).toBeInTheDocument();
  });

  it('un error del back se dice con Reintentar y no muestra adjuntos', () => {
    const refetch = vi.fn();
    state.receipt.mockReturnValue(failed(refetch));
    state.payment.mockReturnValue(mutation());
    draw();
    expect(screen.queryByText(/Foto del remito/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga no muestra adjuntos', () => {
    state.receipt.mockReturnValue(loading());
    state.payment.mockReturnValue(mutation());
    draw();
    expect(screen.queryByText(/Foto del remito/)).not.toBeInTheDocument();
  });
});
