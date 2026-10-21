import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), freshStock: 5 }));
vi.mock('../../../services/queries/gasCylinders', () => ({
  useUpdateGasCylinderStock: () => ({ mutate: mocks.mutate, isPending: false }),
  useGasCylinder: () => ({ refetch: () => Promise.resolve({ data: { stock: mocks.freshStock } }) }),
}));

import type { GasCylinder } from '../../../services/api/types';
import { StockAdjustModal } from './StockAdjustModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.freshStock = 5;
});

const cylinder = { gas_cylinder_id: 'g1', type: '10kg', stock: 5 } as GasCylinder;
const submit = (quantity: string) => {
  fireEvent.change(screen.getByLabelText(/Cantidad a sumar/), { target: { value: quantity } });
  fireEvent.click(screen.getByRole('button', { name: 'Ajustar' }));
};

describe('StockAdjustModal: sin stock negativo', () => {
  it('restar más de lo que hay no se envía', async () => {
    render(<StockAdjustModal open onClose={vi.fn()} cylinder={cylinder} />);
    submit('-6');
    expect(await screen.findByText('Solo hay 5 unidades: no se pueden restar 6')).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('decide con el stock de ahora, no con el de la lista vieja', async () => {
    mocks.freshStock = 20;
    render(<StockAdjustModal open onClose={vi.fn()} cylinder={cylinder} />);
    submit('-6');
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce());
  });
});
