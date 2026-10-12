import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderSummary, receiptSummary } from '../../test/fixtures';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ order: vi.fn(), send: vi.fn(), confirm: vi.fn(), canWrite: true }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canWrite: state.canWrite,
    writeHint: state.canWrite ? undefined : 'Elegí una distribuidora',
  }),
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/purchases', () => ({
  usePurchaseOrder: () => state.order() as unknown,
  useSendPurchaseOrder: () => state.send() as unknown,
}));
vi.mock('../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('./components/OrderReasonModals', () => ({
  CancelOrderModal: ({ order }: { order: unknown }) => (order ? <p>Cancelar orden</p> : null),
  CloseShortModal: () => null,
}));
vi.mock('./components/PurchaseOrderFormModal', () => ({ PurchaseOrderFormModal: () => null }));
vi.mock('./components/PurchaseReceiptFormModal', () => ({
  PurchaseReceiptFormModal: ({ open }: { open: boolean }) => (open ? <p>Formulario de recepción</p> : null),
}));

import { PurchaseOrderDetails } from './PurchaseOrderDetails';

const ORDER = (over: Record<string, unknown> = {}) => ({
  ...orderSummary(),
  items: [
    {
      itemId: 'i-1',
      gasCylinderId: 'g-1',
      gasCylinderType: '10kg',
      quantity: 10,
      unitCost: 5000,
      subtotal: 50000,
      emptiesToExchange: 10,
      receivedQuantity: 4,
      pendingQuantity: 6,
    },
  ],
  receipts: [receiptSummary({ purchaseOrderId: 'po-1', purchaseOrderNumber: 12 })],
  ...over,
});

const draw = () =>
  renderPage(<PurchaseOrderDetails />, { url: '/purchases/orders/po-1', path: '/purchases/orders/:id' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.canWrite = true;
});

describe('PurchaseOrderDetails', () => {
  it('muestra el avance, los renglones con lo pendiente y las recepciones', () => {
    state.order.mockReturnValue(ok(ORDER()));
    state.send.mockReturnValue(mutation());
    draw();
    expect(screen.getByRole('heading', { name: 'Orden de compra N° 12' })).toBeInTheDocument();
    expect(screen.getByText(/4 de 10 recibidas · faltan 6/)).toBeInTheDocument();
    expect(screen.getByText(/pendientes 6/)).toBeInTheDocument();
    expect(screen.getByText('Recepción N° 21')).toBeInTheDocument();
  });

  it('una orden enviada ofrece registrar la recepción y no editar ni enviar', () => {
    state.order.mockReturnValue(ok(ORDER()));
    state.send.mockReturnValue(mutation());
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recepción' }));
    expect(screen.getByText('Formulario de recepción')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('un borrador se envía previa confirmación', async () => {
    const send = mutation();
    state.order.mockReturnValue(ok(ORDER({ status: 'draft' })));
    state.send.mockReturnValue(send);
    state.confirm.mockResolvedValue(true);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(send.mutate).toHaveBeenCalled());
    expect(send.mutate.mock.calls[0][0]).toBe('po-1');
  });

  it('cancelar la orden abre el motivo', () => {
    state.order.mockReturnValue(ok(ORDER()));
    state.send.mockReturnValue(mutation());
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Cancelar orden')).toBeInTheDocument();
  });

  it('sin permiso de escritura no hay acciones y se explica por qué', () => {
    state.canWrite = false;
    state.order.mockReturnValue(ok(ORDER()));
    state.send.mockReturnValue(mutation());
    draw();
    expect(screen.queryByRole('button', { name: 'Registrar recepción' })).not.toBeInTheDocument();
    expect(screen.getByText(/Elegí una distribuidora para operar esta orden/)).toBeInTheDocument();
  });

  it('un error del back se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.order.mockReturnValue(failed(refetch));
    state.send.mockReturnValue(mutation());
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga no muestra la orden', () => {
    state.order.mockReturnValue(loading());
    state.send.mockReturnValue(mutation());
    draw();
    expect(screen.queryByText(/recibidas · faltan/)).not.toBeInTheDocument();
  });
});
