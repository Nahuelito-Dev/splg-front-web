import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mutate = vi.hoisted(() => vi.fn<[{ id: string; body: { cashBoxId: string } }], void>());
const boxes = vi.hoisted(() => ({
  value: [{ cashBoxId: 'caja-1', name: 'Caja central' }] as { cashBoxId: string; name: string }[],
}));

vi.mock('../../../services/queries/fleetExpense', () => ({
  usePayFuelLoadFromCashBox: () => ({ mutate, isPending: false }),
}));
vi.mock('../../../services/queries/finance', () => ({
  useCashBoxes: () => ({ data: { data: boxes.value }, isPending: false, isError: false }),
}));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { FuelLoadCashPaymentModal } from './FuelLoadCashPaymentModal';

const LOAD = { fuelLoadId: 'f-1', carPatent: 'AB123CD', totalAmount: 40000 };

beforeEach(() => {
  mutate.mockReset();
  boxes.value = [{ cashBoxId: 'caja-1', name: 'Caja central' }];
});
afterEach(cleanup);

describe('FuelLoadCashPaymentModal', () => {
  it('exige la caja y manda la elegida a la carga', () => {
    render(<FuelLoadCashPaymentModal load={LOAD as never} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Asentar' }));
    expect(screen.getByText('Elegí la caja de la que sale el efectivo')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Asentar' }));
    expect(mutate.mock.calls[0][0]).toEqual({ id: 'f-1', body: { cashBoxId: 'caja-1' } });
  });

  it('sin cajas de efectivo avisa y no deja asentar', () => {
    boxes.value = [];
    render(<FuelLoadCashPaymentModal load={LOAD as never} onClose={vi.fn()} />);
    expect(screen.getByText(/no tiene cajas de efectivo activas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Asentar' })).toBeDisabled();
  });
});
