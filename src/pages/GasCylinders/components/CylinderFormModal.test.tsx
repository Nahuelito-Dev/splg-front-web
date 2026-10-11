import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GasCylinder } from '../../../services/api/types';

const create = vi.fn();
const update = vi.fn<[{ id: string; body: Record<string, unknown> }], void>();
vi.mock('../../../services/queries/gasCylinders', () => ({
  useCreateGasCylinder: () => ({ mutate: create, isPending: false }),
  useUpdateGasCylinder: () => ({ mutate: update, isPending: false }),
}));

import { CylinderFormModal } from './CylinderFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const producto = {
  gas_cylinder_id: 'g1',
  type: '10kg',
  weight: 10,
  price: 9000,
  stock: 7,
  description: null,
  promotions: [],
} as unknown as GasCylinder;

describe('CylinderFormModal: el stock sólo se carga al crear', () => {
  it('el alta pide el stock inicial', () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={null} />);
    expect(screen.getByLabelText(/Stock inicial/)).toBeInTheDocument();
  });

  it('la edición NO muestra el campo de stock', () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={producto} />);
    expect(screen.queryByLabelText(/Stock/)).not.toBeInTheDocument();
  });

  it('al guardar una edición no manda el stock (la API lo rechaza con 400)', async () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={producto} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    const llamada = update.mock.calls[0][0];
    expect(llamada.id).toBe('g1');
    expect(llamada.body).not.toHaveProperty('stock');
    expect(llamada.body).toMatchObject({ type: '10kg', price: 9000 });
  });
});
