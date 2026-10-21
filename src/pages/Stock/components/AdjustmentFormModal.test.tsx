import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  balances: [{ gasCylinderId: 'g1', gasCylinderType: '10kg', condition: 'full', quantity: 3 }],
}));
vi.mock('../../../services/queries/stock', () => ({
  useStockLocations: () => ({
    data: [{ locationId: 'l1', kind: 'warehouse', name: 'Central', warehouseId: 'w1', carId: null }],
    isError: false,
    refetch: vi.fn(),
  }),
  useStockBalances: () => ({ data: mocks.balances, refetch: () => Promise.resolve({ data: mocks.balances }) }),
  useCreateAdjustment: () => ({ mutate: mocks.create, isPending: false }),
}));
vi.mock('./useStockOptions', () => ({
  useCylinderOptions: () => ({
    options: [{ value: 'g1', label: '10kg' }],
    failed: false,
    refetch: vi.fn(),
  }),
  withPlaceholder: (options: unknown[]) => options,
}));

import { AdjustmentFormModal } from './AdjustmentFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const submit = (amount: string) => {
  fireEvent.change(screen.getByLabelText(/Ubicación/), { target: { value: 'l1' } });
  fireEvent.change(screen.getByLabelText(/^Tipo/), { target: { value: 'g1' } });
  fireEvent.change(screen.getByLabelText(/Cantidad/), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'Se rompió' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar ajuste' }));
};

describe('AdjustmentFormModal: ningún saldo queda negativo', () => {
  it('restar más de lo que hay no se envía', async () => {
    render(<AdjustmentFormModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    submit('5');
    expect(await screen.findByText('Hay 3 llenas de 10kg: no se pueden sacar 5')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('dentro de lo que hay se envía', async () => {
    render(<AdjustmentFormModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    submit('3');
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
  });
});
