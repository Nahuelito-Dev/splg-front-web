import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok } from '../../../test/pageTest';

const fine = vi.hoisted(() => ({ result: undefined as unknown }));
const fileSource = vi.hoisted(() => ({ mutate: vi.fn<[unknown, unknown?], void>(), isPending: false }));
vi.mock('../../../hooks', () => ({ usePermissions: () => ({ canWrite: true, writeHint: undefined }) }));
vi.mock('../../../services/queries/fleetExpense', () => ({ useTrafficFine: () => fine.result }));
vi.mock('../../../services/queries/attachments', () => ({ useAttachmentFile: () => fileSource }));
vi.mock('../../../common/components/AttachmentsPanel', () => ({ AttachmentsPanel: () => <p>Copia del acta</p> }));
vi.mock('./PayFineModal', () => ({
  PayFineModal: ({ fine: f }: { fine: { actNumber: string } | null }) =>
    f ? <p>Modal de pago {f.actNumber}</p> : null,
}));

import { TrafficFineDrawer } from './TrafficFineDrawer';

const FINE = {
  fineId: 'm-1',
  actNumber: 'A-0012345',
  carPatent: 'AB123CD',
  employeeName: null,
  occurredAt: '2026-09-01T15:00:00.000Z',
  dueDate: '2026-11-15',
  jurisdiction: 'Posadas',
  amount: 85000,
  voluntaryPaymentAmount: 59500,
  infraction: 'Velocidad',
  status: 'pending',
  chargedToEmployee: false,
  paymentUrl: 'https://pagos.posadas.test/m-1',
  paymentCode: '998877',
  operationNumber: null,
  receiptAttachmentId: null,
  cashMovementId: null,
  paidAt: null,
  paidAmount: null,
};

const renderDrawer = () =>
  render(
    <MemoryRouter>
      <TrafficFineDrawer fineId="m-1" onClose={vi.fn()} />
    </MemoryRouter>,
  );

beforeEach(() => {
  fileSource.mutate.mockReset();
  fine.result = ok(FINE);
});
afterEach(cleanup);

describe('TrafficFineDrawer', () => {
  it('estados de carga y de error', () => {
    fine.result = loading();
    const { unmount } = renderDrawer();
    expect(screen.queryByText('Acta')).not.toBeInTheDocument();
    unmount();
    fine.result = failed();
    renderDrawer();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });

  it('una multa pendiente ofrece Pagar, el código de pago y Registrar pago de corrido', () => {
    renderDrawer();
    expect(screen.getByRole('link', { name: /Pagar/ })).toHaveAttribute('href', 'https://pagos.posadas.test/m-1');
    expect(screen.getByText('998877')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
    expect(screen.getByText('Modal de pago A-0012345')).toBeInTheDocument();
  });

  it('una apelada también se puede pagar', () => {
    fine.result = ok({ ...FINE, status: 'appealed' });
    renderDrawer();
    expect(screen.getByRole('button', { name: 'Registrar pago' })).toBeInTheDocument();
  });

  it('una multa paga muestra el comprobante, el n.º de operación y el movimiento de caja, sin Registrar pago', () => {
    fine.result = ok({
      ...FINE,
      status: 'paid',
      paidAt: '2026-10-28T13:00:00.000Z',
      paidAmount: 59500,
      operationNumber: 'OP-77',
      receiptAttachmentId: 'att-1',
      cashMovementId: 'mov-abcdef123456',
    });
    renderDrawer();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
    expect(screen.getByText('OP-77')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Movimiento de caja/ })).toHaveAttribute('href', '/finance/movements');
    fireEvent.click(screen.getByRole('button', { name: /Ver comprobante/ }));
    expect(fileSource.mutate.mock.calls[0][0]).toEqual({ attachmentId: 'att-1', disposition: 'inline' });
  });

  it('una multa anulada no ofrece pagar', () => {
    fine.result = ok({ ...FINE, status: 'voided', voidReason: 'Error', voidedAt: '2026-10-28T13:00:00.000Z' });
    renderDrawer();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Pagar/ })).not.toBeInTheDocument();
  });
});
