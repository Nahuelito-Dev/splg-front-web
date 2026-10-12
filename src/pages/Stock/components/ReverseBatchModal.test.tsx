import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReverseBatchModal } from './ReverseBatchModal';

const mutate = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  lines: { isError: false, isPending: false, isSuccess: true, data: { data: [] as unknown[] } },
  reversed: { isError: false, isSuccess: true, data: false },
}));
vi.mock('../../../services/queries/stock', () => ({
  useReverseBatch: () => ({ mutate, isPending: false }),
  useBatchMovements: () => ({ ...state.lines, refetch: vi.fn() }),
  useBatchReversed: () => ({ ...state.reversed, refetch: vi.fn() }),
}));

const line = (id: string, qty: number, type: string) => ({
  movementId: id,
  quantity: qty,
  gasCylinderType: type,
  fromCondition: 'full',
  from: { name: 'Norte' },
  to: { name: 'Central' },
});

afterEach(() => {
  cleanup();
  mutate.mockReset();
  state.lines.data = { data: [line('1', 5, '10kg'), line('2', 3, '25kg')] };
  state.reversed = { isError: false, isSuccess: true, data: false };
});

describe('ReverseBatchModal', () => {
  it('dice que revierte el lote completo y lista todos sus renglones', () => {
    state.lines.data = { data: [line('1', 5, '10kg'), line('2', 3, '25kg')] };
    render(<ReverseBatchModal batchId="B1" onClose={() => {}} />);
    expect(screen.getByText(/Se revierte el lote completo/)).toBeInTheDocument();
    expect(screen.getByText(/Se revierten 2 renglones/)).toBeInTheDocument();
    expect(screen.getByText(/5 10kg/)).toBeInTheDocument();
    expect(screen.getByText(/3 25kg/)).toBeInTheDocument();
  });

  it('contraasienta el lote con el motivo', () => {
    state.lines.data = { data: [line('1', 5, '10kg')] };
    render(<ReverseBatchModal batchId="B1" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Motivo del contraasiento/), { target: { value: 'Error' } });
    fireEvent.click(screen.getByRole('button', { name: 'Contraasentar lote' }));
    expect((mutate.mock.calls[0] as unknown[])[0]).toMatchObject({
      batchId: 'B1',
      body: { notes: 'Error' },
      scope: 'reverse:B1',
    });
  });

  it('un lote ya contraasentado no se ofrece de nuevo', () => {
    state.reversed = { isError: false, isSuccess: true, data: true };
    render(<ReverseBatchModal batchId="B1" onClose={() => {}} />);
    expect(screen.getByText('Este lote ya fue contraasentado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contraasentar lote' })).toBeDisabled();
  });

  it('si no se pudo saber si ya estaba contraasentado, no se ofrece', () => {
    state.reversed = { isError: true, isSuccess: false, data: false };
    render(<ReverseBatchModal batchId="B1" onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Contraasentar lote' })).toBeDisabled();
  });
});
