import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok, renderPage } from '../../test/pageTest';

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../common/components/AttachmentsPanel', () => ({
  AttachmentsPanel: ({ ownerType, ownerId }: { ownerType: string; ownerId: string }) => (
    <p>
      Adjuntos de {ownerType} {ownerId}
    </p>
  ),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/finance', () => ({
  useCustomerAccount: () => ok(CUENTA),
  useCustomerStatement: () => ok({ data: [ASIENTO], total: 1, openingBalance: 0, closingBalance: 500 }),
}));
vi.mock('./components/CustomerAccountFormModal', () => ({ CustomerAccountFormModal: () => null }));
vi.mock('./components/CustomerAdjustmentModal', () => ({ CustomerAdjustmentModal: () => null }));
vi.mock('./components/CustomerPaymentModal', () => ({ CustomerPaymentModal: () => null }));

import { CustomerAccountDetails } from './CustomerAccountDetails';

const CUENTA = {
  accountId: 'a-1',
  businessName: 'Kiosco Sol',
  customerName: 'Ana',
  customerEmail: null,
  taxId: null,
  taxCondition: 'final_consumer',
  paymentTermsDays: 30,
  creditLimit: 10000,
  availableCredit: 9500,
  balance: 500,
  pendingOrdersAmount: 0,
  overdueAmount: 0,
  status: 'active',
  aging: { upTo30Days: 500, from31To60Days: 0, from61To90Days: 0, over90Days: 0, total: 500 },
};
const ASIENTO = {
  entryId: 'e-1',
  type: 'payment',
  orderId: null,
  description: 'Pago en efectivo',
  dueDate: null,
  occurredAt: '2026-10-10T12:00:00.000Z',
  signedAmount: -500,
  pendingAmount: 0,
  balanceAfter: 500,
};

afterEach(cleanup);

describe('CustomerAccountDetails', () => {
  it('abre los comprobantes de un asiento con su dueño y su id', () => {
    renderPage(<CustomerAccountDetails />, { url: '/finance/accounts/a-1', path: '/finance/accounts/:id' });
    expect(screen.queryByText(/Adjuntos de/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Comprobantes' }));
    expect(screen.getByText('Adjuntos de customer_account_entry e-1')).toBeInTheDocument();
  });
});
