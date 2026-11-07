import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCylinder } from '../../../services/api/gasCylinders';

const create = vi.fn<[Record<string, unknown>], void>();
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
  container_price: null,
  stock: 7,
  description: null,
  promotions: [],
} as unknown as CatalogCylinder;

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

describe('CylinderFormModal: precio del envase (F35)', () => {
  const envase = () => screen.getByLabelText(/Precio del envase/);
  const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

  it('arranca vacío en el alta, sin ningún monto sugerido', () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={null} />);
    expect(envase()).toHaveValue(null);
    expect(envase()).not.toHaveAttribute('placeholder');
    expect(screen.getByText(/Se cobra cuando el cliente pide más garrafas/)).toBeInTheDocument();
  });

  it('el alta manda el número cargado', async () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={null} />);
    fireEvent.change(screen.getByLabelText(/Tipo/), { target: { value: '15kg' } });
    fireEvent.change(screen.getByLabelText(/Peso/), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/^Precio \(\$\)/), { target: { value: '12000' } });
    fireEvent.change(envase(), { target: { value: '25000.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ type: '15kg', price: 12000, container_price: 25000.5 });
  });

  it('el alta sin precio de envase manda null', async () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={null} />);
    fireEvent.change(screen.getByLabelText(/Tipo/), { target: { value: '15kg' } });
    fireEvent.change(screen.getByLabelText(/Peso/), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/^Precio \(\$\)/), { target: { value: '12000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toHaveProperty('container_price', null);
  });

  it('editar otro campo NO manda container_price (no pisa el de otro admin)', async () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={{ ...producto, container_price: 30000 }} />);
    await waitFor(() => expect(envase()).toHaveValue(30000));
    fireEvent.change(screen.getByLabelText(/^Precio \(\$\)/), { target: { value: '9500' } });
    guardar();
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body).toMatchObject({ price: 9500 });
    expect(update.mock.calls[0][0].body).not.toHaveProperty('container_price');
  });

  it('sin precio de envase y sin tocarlo, la edición tampoco lo manda', async () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={producto} />);
    guardar();
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body).not.toHaveProperty('container_price');
  });

  it('cargarlo en un producto que no tenía lo manda', async () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={producto} />);
    fireEvent.change(envase(), { target: { value: '18000' } });
    guardar();
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body).toHaveProperty('container_price', 18000);
  });

  it('la edición precarga el precio del envase y manda el nuevo valor', async () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={{ ...producto, container_price: 30000 }} />);
    await waitFor(() => expect(envase()).toHaveValue(30000));
    fireEvent.change(envase(), { target: { value: '31000' } });
    guardar();
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body).toHaveProperty('container_price', 31000);
  });

  it('vaciarlo en la edición manda null (borra el precio)', async () => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={{ ...producto, container_price: 30000 }} />);
    await waitFor(() => expect(envase()).toHaveValue(30000));
    fireEvent.change(envase(), { target: { value: '' } });
    guardar();
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].body).toHaveProperty('container_price', null);
  });

  it.each([
    ['0', 'Tiene que ser mayor que 0'],
    ['-5', 'Tiene que ser mayor que 0'],
    ['10.555', 'Hasta 2 decimales'],
  ])('rechaza %s sin mandar nada', async (value, message) => {
    render(<CylinderFormModal open onClose={vi.fn()} cylinder={producto} />);
    fireEvent.change(envase(), { target: { value } });
    guardar();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });
});
