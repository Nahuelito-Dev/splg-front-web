import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../services/api/errors';
import type { Order } from '../../../../services/api/types';
import { OrderDetailsToolbar } from './OrderDetailsToolbar';

const permissions = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({
  updateOrderStatus: vi.fn(),
  confirmOrderDelivery: vi.fn(),
}));
const notifications = vi.hoisted(() => ({
  confirm: vi.fn(() => Promise.resolve(true)),
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('../../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
vi.mock('../../../../services/api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  updateOrderStatus: api.updateOrderStatus,
  confirmOrderDelivery: api.confirmOrderDelivery,
}));
vi.mock('../../../../utils/notifications', () => ({
  confirm: notifications.confirm,
  notify: notifications.notify,
  isConfirmOpen: vi.fn(() => false),
  subscribeConfirmOpen: vi.fn(() => () => undefined),
}));

afterEach(cleanup);
beforeEach(() => {
  permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
  api.updateOrderStatus.mockReset().mockResolvedValue({ order_id: 'abcdef123456' });
  api.confirmOrderDelivery.mockReset().mockResolvedValue({ order_id: 'abcdef123456' });
  notifications.confirm.mockClear().mockResolvedValue(true);
  notifications.notify.success.mockClear();
  notifications.notify.error.mockClear();
  notifications.notify.info.mockClear();
});

const HINT = 'Elegí una distribuidora para operar';
const order = (status: Order['status'] = 'accepted') =>
  ({
    order_id: 'abcdef123456',
    status,
    created_at: '2026-10-01T13:00:00.000Z',
    delivery_id: null,
  }) as unknown as Order;

const renderToolbar = (status: Order['status'] = 'accepted') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OrderDetailsToolbar order={order(status)} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('OrderDetailsToolbar: permisos', () => {
  it('el administrador general sin distribuidora elegida opera pedidos igual: la API lo permite', () => {
    permissions.mockReturnValue({ canOperate: false, operateHint: HINT });
    renderToolbar();
    expect(screen.getByRole('button', { name: /Asignar chofer/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Cancelar pedido/ })).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Imprimir remito/ })).toBeInTheDocument();
  });
});

describe('OrderDetailsToolbar: entrega manual', () => {
  it('Marcar como entregado pide motivo y manda status + reason', async () => {
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como entregado' }));
    expect(screen.getByRole('dialog', { name: 'Marcar como entregado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar como entregado' })).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), {
      target: { value: 'Cliente confirmó por WhatsApp' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como entregado' }));

    await waitFor(() =>
      expect(api.updateOrderStatus).toHaveBeenCalledWith(
        'abcdef123456',
        {
          status: 'delivered',
          reason: 'Cliente confirmó por WhatsApp',
        },
        expect.any(String),
      ),
    );
  });

  it('Confirmar entrega manda código y motivo en el mismo cuerpo', async () => {
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    fireEvent.change(screen.getByLabelText('Código de entrega'), { target: { value: ' A1B2C3 ' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), {
      target: { value: 'Cliente validó el pedido por teléfono' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));

    await waitFor(() =>
      expect(api.confirmOrderDelivery).toHaveBeenCalledWith(
        'abcdef123456',
        {
          code: 'A1B2C3',
          reason: 'Cliente validó el pedido por teléfono',
        },
        expect.any(String),
      ),
    );
  });

  it('doble click en confirmar entrega dispara un solo envío', async () => {
    api.confirmOrderDelivery.mockReturnValue(new Promise(() => undefined));
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    fireEvent.change(screen.getByLabelText('Código de entrega'), { target: { value: 'A1B2C3' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), {
      target: { value: 'Cliente validó el pedido por teléfono' },
    });
    const submit = screen.getByRole('button', { name: 'Confirmar entrega' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(api.confirmOrderDelivery).toHaveBeenCalledTimes(1));
  });

  it('doble click en entrega manual dispara un solo envío', async () => {
    api.updateOrderStatus.mockReturnValue(new Promise(() => undefined));
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como entregado' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), {
      target: { value: 'Cliente confirmó por WhatsApp' },
    });
    const submit = screen.getByRole('button', { name: 'Marcar como entregado' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(api.updateOrderStatus).toHaveBeenCalledTimes(1));
  });

  it('no permite cerrar la entrega manual mientras envía', async () => {
    api.updateOrderStatus.mockReturnValue(new Promise(() => undefined));
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como entregado' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), {
      target: { value: 'Cliente confirmó por WhatsApp' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como entregado' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('dialog', { name: 'Marcar como entregado' })).toBeInTheDocument();
  });

  it('el error del back viaja del hook al modal y se limpia al editar', async () => {
    api.updateOrderStatus.mockRejectedValue(new ApiError(409, ['El pedido ya fue cerrado']));
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como entregado' }));
    const reason = screen.getByRole('textbox', { name: /Motivo/ });
    fireEvent.change(reason, { target: { value: 'Cliente confirmó por WhatsApp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como entregado' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El pedido ya fue cerrado');
    fireEvent.change(reason, { target: { value: 'Cliente confirmó por llamada telefónica' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el error de confirmar con código queda en el modal y se limpia al editar', async () => {
    api.confirmOrderDelivery.mockRejectedValue(new ApiError(400, ['Código inválido']));
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    fireEvent.change(screen.getByLabelText('Código de entrega'), { target: { value: 'A1B2C3' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), {
      target: { value: 'Cliente validó el pedido por teléfono' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido');
    fireEvent.change(screen.getByLabelText('Código de entrega'), { target: { value: 'Z9Y8X7' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Volver a pendiente sigue pidiendo confirmación y no manda reason', async () => {
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: 'Volver a pendiente' }));
    await waitFor(() => expect(notifications.confirm).toHaveBeenCalled());
    await waitFor(() => expect(api.updateOrderStatus).toHaveBeenCalledWith('abcdef123456', { status: 'pending' }));
  });
});
