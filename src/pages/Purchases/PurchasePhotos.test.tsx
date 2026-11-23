import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderSummary, receiptSummary, supplier } from '../../test/fixtures';
import { mutation, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ suppliers: vi.fn(), order: vi.fn(), receipt: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../common/components/AttachmentsPanel', () => ({ AttachmentsPanel: () => null }));
vi.mock('../../common/components/ImportWizard/ImportWizard', () => ({ ImportWizard: () => null }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/purchases', () => ({
  useSuppliers: () => state.suppliers() as unknown,
  useUpdateSupplier: () => mutation(),
  useDeleteSupplier: () => mutation(),
  usePurchaseOrder: () => state.order() as unknown,
  useSendPurchaseOrder: () => mutation(),
  usePurchaseReceipt: () => state.receipt() as unknown,
  useUpdateReceiptPaymentStatus: () => mutation(),
}));
vi.mock('./components/SupplierFormModal', () => ({ SupplierFormModal: () => null }));
vi.mock('./components/OrderReasonModals', () => ({ CancelOrderModal: () => null, CloseShortModal: () => null }));
vi.mock('./components/PurchaseOrderFormModal', () => ({ PurchaseOrderFormModal: () => null }));
vi.mock('./components/PurchaseReceiptFormModal', () => ({ PurchaseReceiptFormModal: () => null }));
vi.mock('./components/ReceiptPayment', () => ({ ReceiptPayment: () => null }));
vi.mock('./components/VoidReceiptModal', () => ({ VoidReceiptModal: () => null }));

import { PurchaseOrderDetails } from './PurchaseOrderDetails';
import { PurchaseReceiptDetails } from './PurchaseReceiptDetails';
import { Suppliers } from './Suppliers';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Suppliers: foto del proveedor', () => {
  const PHOTO = 'https://fotos.test/proveedor.jpg';
  const draw = (photoUrl: string | null) => {
    state.suppliers.mockReturnValue(ok(pageOf([supplier({ photoUrl })])));
    return renderPage(<Suppliers />, { url: '/purchases/suppliers' });
  };

  it('muestra la foto del proveedor si viene', () => {
    const { container } = draw(PHOTO);
    expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto queda el ícono de siempre', () => {
    const { container } = draw(null);
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PurchaseOrderDetails: foto del producto', () => {
  const PHOTO = 'https://fotos.test/garrafa-10.jpg';
  const draw = (gasCylinderPhotoUrl: string | null) => {
    state.order.mockReturnValue(
      ok({
        ...orderSummary(),
        items: [
          {
            itemId: 'i-1',
            gasCylinderId: 'g-1',
            gasCylinderType: '10kg',
            gasCylinderPhotoUrl,
            quantity: 10,
            unitCost: 5000,
            subtotal: 50000,
            emptiesToExchange: 10,
            receivedQuantity: 4,
            pendingQuantity: 6,
          },
        ],
        receipts: [],
      }),
    );
    return renderPage(<PurchaseOrderDetails />, { url: '/purchases/orders/po-1', path: '/purchases/orders/:id' });
  };

  it('muestra la miniatura del producto en el renglón', () => {
    const { container } = draw(PHOTO);
    expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto no dibuja imagen', () => {
    const { container } = draw(null);
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PurchaseReceiptDetails: foto del producto', () => {
  const PHOTO = 'https://fotos.test/garrafa-10.jpg';
  const draw = (gasCylinderPhotoUrl: string | null) => {
    state.receipt.mockReturnValue(
      ok({
        ...receiptSummary(),
        notes: null,
        voidReason: null,
        voidedAt: null,
        items: [
          {
            itemId: 'i-1',
            gasCylinderId: 'g-1',
            gasCylinderType: '10kg',
            gasCylinderPhotoUrl,
            quantityFull: 10,
            quantityEmptyOut: 8,
            unitCost: 5000,
            subtotal: 50000,
          },
        ],
      }),
    );
    return renderPage(<PurchaseReceiptDetails />, { url: '/purchases/receipts/r-1', path: '/purchases/receipts/:id' });
  };

  it('muestra la miniatura del producto en el renglón', () => {
    const { container } = draw(PHOTO);
    expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto no dibuja imagen', () => {
    const { container } = draw(null);
    expect(container.querySelector('img')).toBeNull();
  });
});
