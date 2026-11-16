import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TruckLoad } from '../../../services/api/types';
import { CloseLoadModal } from './CloseLoadModal';

const mutate = vi.hoisted(() => vi.fn());
const truck = vi.hoisted(() => ({ data: { carId: 'c', items: [] } as unknown, isPending: false, isError: false }));
vi.mock('../../../services/queries/truckLoads', () => ({
  useCloseTruckLoad: () => ({ mutate, isPending: false }),
  useTruckStock: () => ({ ...truck, refetch: vi.fn() }),
}));

const item = (diff: number, onTruckFull = 4 + diff) => ({
  itemId: 'i',
  gasCylinderId: 'g',
  gasCylinderType: '10kg',
  expectedFull: 4,
  expectedEmpty: 6,
  declaredReturnFull: 4 + diff,
  declaredReturnEmpty: 6,
  onTruckFull,
  onTruckEmpty: 6,
  differenceFull: diff,
  differenceEmpty: 0,
});
const load = (diff: number, onTruckFull = 4 + diff) =>
  ({
    loadId: 'L1',
    number: 7,
    items: [item(diff, onTruckFull)],
    cash: { cashCollectedAmount: 1000, unpaidAmount: 500, pendingConfirmationAmount: 0 },
  }) as unknown as TruckLoad;

afterEach(() => {
  cleanup();
  truck.data = { carId: 'c', items: [] };
  truck.isPending = false;
  truck.isError = false;
  mutate.mockReset();
});

describe('CloseLoadModal', () => {
  it('con diferencia no rinde sin nota', () => {
    render(<CloseLoadModal open onClose={() => {}} load={load(-1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rendir con diferencia' }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Explicá la diferencia')).toBeInTheDocument();
  });

  it('con diferencia y nota rinde, con clave de idempotencia', () => {
    render(<CloseLoadModal open onClose={() => {}} load={load(-1)} />);
    fireEvent.change(screen.getByLabelText(/Nota de la diferencia/), { target: { value: 'Se rompió una' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rendir con diferencia' }));
    expect(mutate).toHaveBeenCalledTimes(1);
    const [vars] = mutate.mock.calls[0] as [{ id: string; body: { differenceNote: string }; scope: string }];
    expect(vars.body.differenceNote).toBe('Se rompió una');
    expect(vars.scope).toBe('close:L1');
  });

  it('sin diferencia rinde sin nota y muestra el efectivo', () => {
    render(<CloseLoadModal open onClose={() => {}} load={load(0)} />);
    expect(screen.getByText('Efectivo cobrado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rendir' }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('saldo real distinto de lo declarado, con lo esperado coincidiendo: nota obligatoria y explica por qué', () => {
    render(<CloseLoadModal open onClose={() => {}} load={load(0, 7)} />);
    expect(screen.getByText(/Hay diferencia, por eso la nota es obligatoria/)).toBeInTheDocument();
    expect(screen.getByText(/el camión tiene 7 llenas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rendir con diferencia' }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('un tipo del camión que la carga no lista obliga a la nota', () => {
    truck.data = {
      carId: 'c',
      items: [{ gasCylinderId: 'zz', gasCylinderType: '25kg', full: 2, empty: 0, defective: 0 }],
    };
    render(<CloseLoadModal open onClose={() => {}} load={load(0)} />);
    expect(screen.getByText(/25kg: el camión tiene 2 llenas/)).toBeInTheDocument();
  });

  it('si no se pudo leer el saldo real, pide la nota por las dudas', () => {
    truck.data = undefined;
    truck.isError = true;
    render(<CloseLoadModal open onClose={() => {}} load={load(0)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rendir con diferencia' }));
    expect(mutate).not.toHaveBeenCalled();
  });
});
