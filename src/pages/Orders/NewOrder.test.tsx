import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const permissions = vi.hoisted(() => vi.fn());
const createOrder = vi.hoisted(() => vi.fn());
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
vi.mock('../../services/queries/orders', () => ({ useCreateOrder: () => ({ mutate: createOrder, isPending: false }) }));
vi.mock('../../services/queries/userAddresses', () => ({
  useUserAddresses: () => ({
    data: [{ address_id: 'a-1', street: 'Calle 1', city: 'Posadas', isDefault: false }],
    isPending: false,
  }),
}));
vi.mock('./components/CustomerPicker', () => ({
  CustomerPicker: ({ onSelect }: { onSelect: (customer: { user_id: string }) => void }) => (
    <button type="button" onClick={() => onSelect({ user_id: 'u-1' })}>
      Elegir cliente
    </button>
  ),
}));
vi.mock('./components/NewOrderItems', () => ({
  NewOrderItems: ({ setValue }: { setValue: (name: 'items', value: unknown[]) => void }) => (
    <button type="button" onClick={() => setValue('items', [{ gasCylinderId: 'g-1', quantity: 1, unitPrice: 100 }])}>
      Cargar ítems
    </button>
  ),
}));

import { NewOrder } from './NewOrder';

afterEach(() => {
  cleanup();
  createOrder.mockReset();
});

const WRITE_HINT = 'Elegí una distribuidora con «Ver como» para crear';
const renderPage = () =>
  render(
    <MemoryRouter>
      <NewOrder />
    </MemoryRouter>,
  );

const fillForm = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Elegir cliente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cargar ítems' }));
  fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'a-1' } });
};

describe('NewOrder: administrador general sin distribuidora elegida', () => {
  it('«Crear pedido» queda bloqueado con su explicación: POST /orders pide la distribuidora', () => {
    permissions.mockReturnValue({ canWrite: false, writeHint: WRITE_HINT });
    renderPage();
    const submit = screen.getByRole('button', { name: 'Crear pedido' });
    expect(submit).toHaveAttribute('aria-disabled', 'true');
    expect(submit).toHaveAttribute('title', WRITE_HINT);
    fireEvent.click(submit);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('aunque el formulario esté completo no se manda: la API contestaría 400', async () => {
    permissions.mockReturnValue({ canWrite: false, writeHint: WRITE_HINT });
    renderPage();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('con distribuidora elegida y el formulario completo, sí se manda', async () => {
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    renderPage();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
  });

  it('con distribuidora elegida el botón está habilitado', () => {
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    renderPage();
    expect(screen.getByRole('button', { name: 'Crear pedido' })).not.toHaveAttribute('aria-disabled');
  });
});
