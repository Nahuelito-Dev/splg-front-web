import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({
  useCrumbLeaf: () => undefined,
  PdfButton: () => <button type="button">PDF</button>,
}));
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
  useDriverSettlement: () => state.query() as unknown,
  useReopenDriverSettlement: () => mutation(),
}));
vi.mock('./components/SubmitSettlementModal', () => ({ SubmitSettlementModal: () => null }));
vi.mock('./components/ApproveSettlementModal', () => ({ ApproveSettlementModal: () => null }));

import { DriverSettlementDetails } from './DriverSettlementDetails';

const RENDICION = {
  settlementId: 's-1',
  number: 12,
  status: 'submitted',
  driverName: 'Pedro',
  businessDate: '2026-10-10',
  expectedCash: 1000,
  declaredCash: 1000,
  driverExpenses: 0,
  difference: 0,
  cashFromOrders: 1000,
  cashFromCollections: 0,
  differenceResolution: null,
  truckLoadId: null,
  truckLoadStatus: null,
  submittedAt: null,
  approvedAt: null,
  notes: null,
  orders: [],
  collections: [],
  expenses: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DriverSettlementDetails', () => {
  it('monta los adjuntos de la rendición con su dueño y su id', () => {
    state.query.mockReturnValue(ok(RENDICION));
    renderPage(<DriverSettlementDetails />, { url: '/finance/settlements/s-1', path: '/finance/settlements/:id' });
    expect(screen.getByText('Adjuntos de driver_settlement s-1')).toBeInTheDocument();
  });
});
