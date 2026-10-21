import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transfer: vi.fn(),
  boxes: [
    { cashBoxId: 'b1', name: 'Caja central', kind: 'cash', balance: 100 },
    { cashBoxId: 'b2', name: 'Banco', kind: 'bank', balance: 0 },
  ],
}));
vi.mock('../../../services/queries/finance', () => ({
  useCashBoxOptions: () => ({
    data: { data: mocks.boxes },
    refetch: () => Promise.resolve({ data: { data: mocks.boxes } }),
  }),
  useTransferCash: () => ({ mutate: mocks.transfer, isPending: false }),
}));

import { TransferModal } from './TransferModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const submit = (from: string, to: string, amount: string) => {
  fireEvent.change(screen.getByLabelText(/Desde/), { target: { value: from } });
  fireEvent.change(screen.getByLabelText(/Hacia/), { target: { value: to } });
  fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: amount } });
  fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
};

describe('TransferModal: saldo de la caja de efectivo de origen', () => {
  it('sacar más de lo que tiene no se envía', async () => {
    render(<TransferModal open onClose={vi.fn()} />);
    submit('b1', 'b2', '150');
    expect(await screen.findByText(/Saldo insuficiente/)).toBeInTheDocument();
    expect(mocks.transfer).not.toHaveBeenCalled();
  });

  it('dentro del saldo se envía; un banco puede quedar en negativo', async () => {
    render(<TransferModal open onClose={vi.fn()} />);
    submit('b1', 'b2', '100');
    await waitFor(() => expect(mocks.transfer).toHaveBeenCalledOnce());
    cleanup();
    vi.clearAllMocks();
    render(<TransferModal open onClose={vi.fn()} />);
    submit('b2', 'b1', '500');
    await waitFor(() => expect(mocks.transfer).toHaveBeenCalledOnce());
  });
});
