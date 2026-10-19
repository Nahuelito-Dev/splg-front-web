import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { receiptSummary } from '../../../test/fixtures';

interface MutateVars {
  id: string;
  body: { paymentStatus: string; paidInCash?: boolean; cashBoxId?: string };
}
const mutate = vi.hoisted(() => vi.fn<[MutateVars, unknown], void>());
const boxes = vi.hoisted(() => ({
  value: [{ cashBoxId: 'caja-1', name: 'Caja central' }] as { cashBoxId: string; name: string }[],
}));

vi.mock('../../../services/queries/purchases', () => ({
  useUpdateReceiptPaymentStatus: () => ({ mutate, isPending: false }),
}));
vi.mock('../../../services/queries/finance', () => ({
  useCashBoxes: () => ({ data: { data: boxes.value }, isPending: false, isError: false }),
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { PayReceiptModal } from './PayReceiptModal';

const draw = () => render(<PayReceiptModal receipt={receiptSummary() as never} onClose={vi.fn()} />);

beforeEach(() => {
  mutate.mockReset();
  boxes.value = [{ cashBoxId: 'caja-1', name: 'Caja central' }];
});
afterEach(cleanup);

describe('PayReceiptModal', () => {
  it('sin efectivo es sólo la marca: no manda caja', () => {
    draw();
    expect(screen.queryByRole('combobox', { name: /Caja/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar pagada' }));
    expect(mutate.mock.calls[0][0]).toEqual({ id: 'r-1', body: { paymentStatus: 'paid' } });
  });

  it('en efectivo con cajas exige elegir la caja antes de mandar', () => {
    draw();
    fireEvent.click(screen.getByRole('checkbox', { name: /Se pagó en efectivo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar pagada' }));
    expect(screen.getByText('Elegí la caja de la que sale el efectivo')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('en efectivo manda paidInCash y la caja elegida', () => {
    draw();
    fireEvent.click(screen.getByRole('checkbox', { name: /Se pagó en efectivo/ }));
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar pagada' }));
    expect(mutate.mock.calls[0][0]).toEqual({
      id: 'r-1',
      body: { paymentStatus: 'paid', paidInCash: true, cashBoxId: 'caja-1' },
    });
  });

  it('sin cajas de efectivo en la distribuidora se paga en efectivo sin caja', () => {
    boxes.value = [];
    draw();
    fireEvent.click(screen.getByRole('checkbox', { name: /Se pagó en efectivo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar pagada' }));
    expect(mutate.mock.calls[0][0].body).toEqual({ paymentStatus: 'paid', paidInCash: true });
  });
});
