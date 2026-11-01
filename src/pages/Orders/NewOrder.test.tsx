import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const permissions = vi.hoisted(() => vi.fn());
const createOrder = vi.hoisted(() => vi.fn());
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn() },
}));
const deliveryOptions = vi.hoisted(() => ({ data: undefined as unknown }));
const quote = vi.hoisted(() => ({ data: undefined as unknown, body: vi.fn() }));
vi.mock('../../services/queries/orders', () => ({
  useCreateOrder: () => ({ mutate: createOrder, isPending: false }),
  useDeliveryOptions: () => ({ data: deliveryOptions.data }),
  useOrderQuote: (body: unknown) => {
    quote.body(body);
    return { data: quote.data, error: null, isFetching: false, stale: false };
  },
}));
vi.mock('../../services/queries/timeSlots', () => ({
  // El 16/01/2999 la franja de la mañana ya está completa; el 17 la consulta sigue pendiente y el 18 falla.
  useTimeSlotAvailability: (date: string) => ({
    isError: date === '2999-01-18',
    data:
      date && date !== '2999-01-17' && date !== '2999-01-18'
        ? [
            {
              timeSlotId: 't-1',
              name: 'Mañana',
              startTime: '09:00',
              endTime: '12:00',
              capacity: 5,
              booked: date === '2999-01-16' ? 5 : 1,
              remaining: date === '2999-01-16' ? 0 : 4,
            },
            {
              timeSlotId: 't-2',
              name: 'Tarde',
              startTime: '16:00',
              endTime: '19:00',
              capacity: 5,
              booked: 5,
              remaining: 0,
            },
          ]
        : undefined,
  }),
}));
vi.mock('../../services/queries/finance', () => ({
  useCustomerAccountOf: () => ({ data: null, isPending: false }),
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
  NewOrderItems: () => {
    const { setValue } = useFormContext();
    return (
      <button type="button" onClick={() => setValue('items', [{ gasCylinderId: 'g-1', quantity: 1, unitPrice: 100 }])}>
        Cargar ítems
      </button>
    );
  },
}));

import { NewOrder } from './NewOrder';

afterEach(() => {
  cleanup();
  createOrder.mockReset();
  deliveryOptions.data = undefined;
  quote.data = undefined;
  quote.body.mockReset();
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

  it('manda el total de la cotización que se está viendo (lo cotizado es lo cobrado)', async () => {
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    quote.data = { items: [], subtotal: 18000, total: 19350, paymentSurcharge: 1350 };
    renderPage();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({ expectedTotal: 19350 }), expect.anything());
    quote.data = undefined;
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

  describe('cotización del back', () => {
    it('antes de elegir cliente, dirección e ítems no cotiza y lo explica', () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      renderPage();
      expect(screen.getByText(/Elegí un cliente/)).toBeInTheDocument();
      expect(quote.body).toHaveBeenLastCalledWith(null);
    });

    it('con todo cargado cotiza con la modalidad y el pago elegidos y muestra los recargos y el total del back', () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      quote.data = {
        items: [{ gasCylinderId: 'g-1', title: 'Garrafa 10kg', quantity: 1, unitPrice: 100, subtotal: 100 }],
        subtotal: 100,
        zone: { name: 'Zona norte' },
        zoneSurcharge: 5,
        paymentSurcharge: 10,
        expressSurcharge: 0,
        total: 115,
      };
      renderPage();
      fillForm();
      fireEvent.change(screen.getByLabelText('Método de pago'), { target: { value: 'transfer' } });
      expect(quote.body).toHaveBeenLastCalledWith({
        customerId: 'u-1',
        addressId: 'a-1',
        paymentMethod: 'transfer',
        deliveryMode: 'standard',
        items: [{ gasCylinderId: 'g-1', quantity: 1, unitPrice: 100 }],
      });
      expect(screen.getByText('Recargo de zona (Zona norte)')).toBeInTheDocument();
      expect(screen.getByText('Recargo por medio de pago')).toBeInTheDocument();
      expect(screen.queryByText('Recargo express')).not.toBeInTheDocument();
      expect(screen.getByText('Total').nextElementSibling).toHaveTextContent('115');
    });
    it('sin distribuidora elegida no cotiza y muestra el aviso', () => {
      permissions.mockReturnValue({ canWrite: false, writeHint: WRITE_HINT });
      renderPage();
      fillForm();
      expect(quote.body).toHaveBeenLastCalledWith(null);
      expect(screen.getAllByText(WRITE_HINT).length).toBeGreaterThan(0);
    });
  });

  describe('reserva programada con seña (CU-072)', () => {
    it('sin marcar la reserva no muestra fecha ni seña', () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      renderPage();
      expect(screen.queryByLabelText(/Fecha de entrega/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Monto de la seña/)).not.toBeInTheDocument();
    });

    it('al crear manda isReservation, la fecha, la franja y la seña', async () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      renderPage();
      fillForm();
      fireEvent.click(screen.getByLabelText(/Es una reserva con seña/));
      fireEvent.change(screen.getByLabelText(/Fecha de entrega/), { target: { value: '2999-01-15' } });
      fireEvent.change(screen.getByLabelText('Franja horaria'), { target: { value: 't-1' } });
      fireEvent.change(screen.getByLabelText(/Monto de la seña/), { target: { value: '1500' } });
      expect(screen.getByRole('option', { name: /Mañana.*4 de 5 libres/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Crear reserva' }));
      await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
      expect(createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          isReservation: true,
          scheduledDate: '2999-01-15',
          timeSlotId: 't-1',
          depositAmount: 1500,
        }),
        expect.anything(),
      );
    });

    it('sin fecha ni seña no se manda y marca los dos errores', async () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      renderPage();
      fillForm();
      fireEvent.click(screen.getByLabelText(/Es una reserva con seña/));
      fireEvent.click(screen.getByRole('button', { name: 'Crear reserva' }));
      expect(await screen.findByText('Una reserva requiere fecha de entrega')).toBeInTheDocument();
      expect(screen.getByText(/Indicá el monto de la seña/)).toBeInTheDocument();
      expect(createOrder).not.toHaveBeenCalled();
    });

    it('una reserva no ofrece cuenta corriente y el express queda deshabilitado', () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      deliveryOptions.data = {
        addressId: 'a-1',
        options: [
          { mode: 'standard', available: true, reason: null, message: null, surchargeAmount: 0, estimatedMinutes: 180 },
          {
            mode: 'express',
            available: true,
            reason: null,
            message: null,
            surchargeAmount: 1500,
            estimatedMinutes: 45,
          },
        ],
      };
      renderPage();
      fillForm();
      expect(screen.getByRole('option', { name: /cuenta corriente/i })).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText(/Es una reserva con seña/));
      expect(screen.queryByRole('option', { name: /cuenta corriente/i })).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /Express \(moto\)/ })).toBeDisabled();
    });
  });

  describe('tope de la seña contra la cotización', () => {
    const cotizacion = {
      items: [],
      subtotal: 100,
      zoneSurcharge: 0,
      paymentSurcharge: 0,
      total: 1000,
      deposit: 0,
      balance: 1000,
    };

    it('una seña mayor al total cotizado marca el campo y no manda el alta', async () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      quote.data = cotizacion;
      renderPage();
      fillForm();
      fireEvent.click(screen.getByLabelText(/Es una reserva con seña/));
      fireEvent.change(screen.getByLabelText(/Fecha de entrega/), { target: { value: '2999-01-15' } });
      fireEvent.change(screen.getByLabelText(/Monto de la seña/), { target: { value: '1500' } });
      expect(
        await screen.findByText(/La seña \(.*1\.500,00\) no puede superar el total del pedido/),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Crear reserva' }));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(createOrder).not.toHaveBeenCalled();
    });
  });

  describe('franjas sin cupo y enlace de pago', () => {
    it('una franja sin cupo no se ofrece y se avisa', () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      renderPage();
      fillForm();
      fireEvent.click(screen.getByLabelText(/Es una reserva con seña/));
      fireEvent.change(screen.getByLabelText(/Fecha de entrega/), { target: { value: '2999-01-15' } });
      expect(screen.getByRole('option', { name: /Mañana/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Tarde/ })).not.toBeInTheDocument();
      expect(screen.getByText('1 franja(s) sin cupo no se ofrecen.')).toBeInTheDocument();
    });

    it('si al cambiar de fecha la franja elegida ya no tiene cupo, se limpia, se avisa y no se manda', async () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      renderPage();
      fillForm();
      fireEvent.click(screen.getByLabelText(/Es una reserva con seña/));
      fireEvent.change(screen.getByLabelText(/Fecha de entrega/), { target: { value: '2999-01-15' } });
      fireEvent.change(screen.getByLabelText('Franja horaria'), { target: { value: 't-1' } });
      fireEvent.change(screen.getByLabelText(/Monto de la seña/), { target: { value: '1500' } });
      expect(screen.getByLabelText('Franja horaria')).toHaveValue('t-1');
      fireEvent.change(screen.getByLabelText(/Fecha de entrega/), { target: { value: '2999-01-16' } });
      await waitFor(() => expect(screen.getByLabelText('Franja horaria')).toHaveValue(''));
      expect(screen.getByText(/La franja elegida ya no tiene cupo/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Crear reserva' }));
      await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
      expect((createOrder.mock.calls[0] as unknown[])[0]).not.toHaveProperty('timeSlotId');
    });

    it.each([
      ['pendiente', '2999-01-17'],
      ['caída', '2999-01-18'],
    ])('al cambiar de fecha con la consulta %s no se manda la franja anterior', async (_label, date) => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      renderPage();
      fillForm();
      fireEvent.click(screen.getByLabelText(/Es una reserva con seña/));
      fireEvent.change(screen.getByLabelText(/Fecha de entrega/), { target: { value: '2999-01-15' } });
      fireEvent.change(screen.getByLabelText('Franja horaria'), { target: { value: 't-1' } });
      fireEvent.change(screen.getByLabelText(/Monto de la seña/), { target: { value: '1500' } });
      fireEvent.change(screen.getByLabelText(/Fecha de entrega/), { target: { value: date } });
      await waitFor(() => expect(screen.getByLabelText('Franja horaria')).toHaveValue(''));
      fireEvent.click(screen.getByRole('button', { name: 'Crear reserva' }));
      await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
      expect((createOrder.mock.calls[0] as unknown[])[0]).not.toHaveProperty('timeSlotId');
    });

    it('con la seña por MercadoPago explica que se genera el enlace', () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      renderPage();
      fireEvent.click(screen.getByLabelText(/Es una reserva con seña/));
      fireEvent.change(screen.getByLabelText('Método de pago'), { target: { value: 'mercadopago' } });
      expect(screen.getByText(/se genera el enlace de pago de la seña/)).toBeInTheDocument();
    });

    it('un alta de MercadoPago muestra el enlace de pago antes de salir de la pantalla', async () => {
      permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
      createOrder.mockImplementation((_body: unknown, options: { onSuccess: (order: unknown) => void }) =>
        options.onSuccess({ order_id: 'o-9', payment_url: 'https://mp.test/checkout/9' }),
      );
      renderPage();
      fillForm();
      fireEvent.change(screen.getByLabelText('Método de pago'), { target: { value: 'mercadopago' } });
      fireEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));
      expect(await screen.findByText('https://mp.test/checkout/9')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Abrir/ })).toHaveAttribute('href', 'https://mp.test/checkout/9');
    });
  });
});
