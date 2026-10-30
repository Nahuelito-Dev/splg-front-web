import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok, pageOf, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ canWrite: true, orderId: null as string | null, systemAuthor: false }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components/AttachmentsPanel', () => ({
  AttachmentsPanel: ({ ownerType, ownerId, canWrite }: { ownerType: string; ownerId: string; canWrite: boolean }) => (
    <p>
      Adjuntos de {ownerType} {ownerId} {canWrite ? 'con escritura' : 'solo lectura'}
    </p>
  ),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite, writeHint: undefined }),
}));
vi.mock('../../services/queries/finance', () => ({
  useCashBoxOptions: () => ok(pageOf([])),
  useCashCategories: () => ok(pageOf([])),
  useCashMovements: () =>
    ok(pageOf([{ ...MOVIMIENTO, orderId: state.orderId, createdByUserId: state.systemAuthor ? null : 'u-1' }])),
  useReverseCashMovement: () => mutation(),
  useReverseCashTransfer: () => mutation(),
}));
vi.mock('./components/FinanceSummary', () => ({ FinanceSummary: () => null }));
vi.mock('./components/CashMovementFormModal', () => ({ CashMovementFormModal: () => null }));
vi.mock('./components/TransferModal', () => ({ TransferModal: () => null }));

import { CashMovements } from './CashMovements';

const MOVIMIENTO = {
  movementId: 'm-1',
  cashBoxId: 'c-1',
  cashBoxName: 'Mostrador',
  sessionId: null,
  direction: 'out',
  amount: 2500,
  categoryId: 'k-1',
  categoryName: 'Insumos',
  method: 'cash',
  occurredAt: '2026-10-10T12:00:00.000Z',
  description: 'Compra de lavandina',
  referenceType: 'manual',
  referenceId: null,
  orderId: null,
  reversesMovementId: null,
  reversed: false,
  createdByUserId: 'u-1',
  createdAt: '2026-10-10T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  state.canWrite = true;
  state.orderId = null;
  state.systemAuthor = false;
});

describe('CashMovements', () => {
  it('un movimiento que nace de un cobro de venta lleva a su pedido', () => {
    state.orderId = 'ord-9';
    renderPage(<CashMovements />, { url: '/finance/movements' });
    fireEvent.click(screen.getByRole('button', { name: 'Ver pedido' }));
    expect(screen.getByText('otra ruta')).toBeInTheDocument();
  });

  it('un movimiento que se asentó solo (sin autor) lo dice: «Sistema»', () => {
    state.systemAuthor = true;
    renderPage(<CashMovements />, { url: '/finance/movements' });
    expect(screen.getAllByText(/· Sistema/).length).toBeGreaterThan(0);
  });

  it('un movimiento de una persona no dice «Sistema»', () => {
    renderPage(<CashMovements />, { url: '/finance/movements' });
    expect(screen.queryByText(/Sistema/)).not.toBeInTheDocument();
  });

  it('un movimiento sin pedido no ofrece «Ver pedido»', () => {
    renderPage(<CashMovements />, { url: '/finance/movements' });
    expect(screen.queryByText('Ver pedido')).not.toBeInTheDocument();
  });

  it('abre los comprobantes de un movimiento con su dueño y su id', () => {
    renderPage(<CashMovements />, { url: '/finance/movements' });
    expect(screen.queryByText(/Adjuntos de/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Comprobantes' }));
    expect(screen.getByText('Adjuntos de cash_movement m-1 con escritura')).toBeInTheDocument();
  });

  it('sin permiso de escritura los comprobantes sólo se consultan', () => {
    state.canWrite = false;
    renderPage(<CashMovements />, { url: '/finance/movements' });
    fireEvent.click(screen.getByRole('button', { name: 'Comprobantes' }));
    expect(screen.getByText('Adjuntos de cash_movement m-1 solo lectura')).toBeInTheDocument();
  });
});
