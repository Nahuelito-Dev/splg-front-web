import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ query: vi.fn() }));

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
vi.mock('../../services/queries/stock', () => ({ useAdjustment: () => state.query() as unknown }));

import { AdjustmentDetails } from './AdjustmentDetails';

const AJUSTE = {
  adjustmentId: 'a-1',
  number: 7,
  location: { locationId: 'l-1', name: 'Galpón Central', kind: 'warehouse' },
  reason: 'shrinkage',
  notes: 'Se rompió una',
  batchId: 'b-1',
  createdByName: 'Ana',
  createdAt: '2026-10-10T12:00:00.000Z',
  items: [{ gasCylinderId: 'g-1', gasCylinderType: '10kg', condition: 'full', quantityDelta: -2 }],
};

const draw = () => renderPage(<AdjustmentDetails />, { url: '/stock/adjustments/a-1', path: '/stock/adjustments/:id' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdjustmentDetails', () => {
  it('muestra la nota, qué cambió y el panel de adjuntos del ajuste', () => {
    state.query.mockReturnValue(ok(AJUSTE));
    draw();
    expect(screen.getByRole('heading', { name: 'Ajuste N° 7' })).toBeInTheDocument();
    expect(screen.getByText('Se rompió una')).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(screen.getByText('Adjuntos de stock_adjustment a-1')).toBeInTheDocument();
  });

  it('un error del back se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.query.mockReturnValue(failed(refetch));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga no muestra el ajuste', () => {
    state.query.mockReturnValue(loading());
    draw();
    expect(screen.queryByText('Se rompió una')).not.toBeInTheDocument();
  });
});
