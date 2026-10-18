import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const permissions = vi.hoisted(() => vi.fn());
const createOrder = vi.hoisted(() => vi.fn());
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
const deliveryOptions = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('../../services/queries/orders', () => ({
  useCreateOrder: () => ({ mutate: createOrder, isPending: false }),
  useDeliveryOptions: () => ({ data: deliveryOptions.data }),
}));
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
  deliveryOptions.data = undefined;
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

  describe('modalidad de entrega (CU-148)', () => {
    const options = (expressAvailable: boolean) => ({
      addressId: 'a-1',
      options: [
        { mode: 'standard', available: true, reason: null, message: null, surchargeAmount: 0, estimatedMinutes: 180 },
        {
          mode: 'express',
          available: expressAvailable,
          reason: expressAvailable ? null : 'no_motorcycle_driver',
          message: expressAvailable ? null : 'No hay un chofer en moto disponible cerca',
          surchargeAmount: expressAvailable ? 1500 : 0,
          estimatedMinutes: 45,
        },
      ],
    });

    it('ofrece el express con su recargo y lo manda al crear', async () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      deliveryOptions.data = options(true);
      renderPage();
      fillForm();
      const express = screen.getByRole('radio', { name: /Express \(moto\)/ });
      expect(express).toBeEnabled();
      fireEvent.click(express);
      fireEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));
      await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
      expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({ deliveryMode: 'express' }), expect.anything());
    });

    it('si no hay moto lo deshabilita con el motivo y el pedido sale programado', async () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      deliveryOptions.data = options(false);
      renderPage();
      fillForm();
      expect(screen.getByRole('radio', { name: /Express \(moto\)/ })).toBeDisabled();
      expect(screen.getByText(/No hay un chofer en moto disponible cerca/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));
      await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
      expect(createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryMode: 'standard' }),
        expect.anything(),
      );
    });
  });
});
