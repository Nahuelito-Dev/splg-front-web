import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../services/api/errors';
import type { Order } from '../../../../services/api/types';
import { OrderPaymentActions } from './OrderPaymentActions';

const permissions = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({
  registerCashPayment: vi.fn(),
  registerUnpaidPayment: vi.fn(),
  confirmTransfer: vi.fn(),
}));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
vi.mock('../../../../services/api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify,
}));

afterEach(cleanup);
beforeEach(() => {
  permissions.mockReturnValue({ canOperate: true, operateHint: undefined });
  api.registerCashPayment
    .mockReset()
    .mockImplementation((_id: string, body: { reason: string }) =>
      Promise.resolve({ order_id: 'abcdef123456', paymentResolutionNote: body.reason }),
    );
  api.confirmTransfer
    .mockReset()
    .mockImplementation((_id: string, body: { reason: string }) =>
      Promise.resolve({ order_id: 'abcdef123456', paymentResolutionNote: body.reason }),
    );
  api.registerUnpaidPayment
    .mockReset()
    .mockImplementation((_id: string, body: { reason: string }) =>
      Promise.resolve({ incident: { description: `informado: ${body.reason}` } }),
    );
  notify.success.mockClear();
  notify.info.mockClear();
});

const REASON = 'El chofer fue dado de baja antes de rendir';
const order = (over: Partial<Order>) =>
  ({
    order_id: 'abcdef123456',
    status: 'delivered',
    paymentMethodDetail: 'cash',
    paymentStatus: 'pending',
    ...over,
  }) as Order;

const renderActions = (over: Partial<Order>) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OrderPaymentActions order={order(over)} />
    </QueryClientProvider>,
  );

const writeReason = (value = REASON) =>
  fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), { target: { value } });

describe('OrderPaymentActions: qué se ofrece', () => {
  it('efectivo entregado y pendiente: cobro e impago', () => {
    renderActions({});
    expect(screen.getByRole('button', { name: 'Registrar cobro en efectivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar impago' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /transferencia/i })).not.toBeInTheDocument();
  });

  it('transferencia entregada y pendiente: recibida y no recibida', () => {
    renderActions({ paymentMethodDetail: 'transfer' });
    expect(screen.getByRole('button', { name: 'Confirmar transferencia recibida' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar como no recibida' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar impago' })).not.toBeInTheDocument();
  });

  it('transferencia rechazada: sólo «recibida» (llegó tarde)', () => {
    renderActions({ paymentMethodDetail: 'transfer', paymentStatus: 'failed' });
    expect(screen.getByRole('button', { name: 'Confirmar transferencia recibida' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como no recibida' })).not.toBeInTheDocument();
  });

  it('transferencia antes de entregar: «recibida» sí, «no recibida» no', () => {
    renderActions({ paymentMethodDetail: 'transfer', status: 'out_for_delivery' });
    expect(screen.getByRole('button', { name: 'Confirmar transferencia recibida' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como no recibida' })).not.toBeInTheDocument();
  });

  it('nada si ya está cobrado, es MercadoPago o el pedido se canceló', () => {
    for (const over of [
      { paymentStatus: 'paid' as const },
      { paymentMethodDetail: 'mercadopago' as const },
      { paymentMethodDetail: 'transfer' as const, status: 'cancelled' as const },
    ]) {
      const { container, unmount } = renderActions(over);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
});

describe('OrderPaymentActions: administrador general sin distribuidora', () => {
  it('los cobros se ven pero quedan bloqueados con su explicación y no abren nada', () => {
    const hint = 'Elegí una distribuidora en «Ver como» para operar';
    permissions.mockReturnValue({ canOperate: false, operateHint: hint });
    renderActions({});
    for (const name of ['Registrar cobro en efectivo', 'Registrar impago']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('title', hint);
      fireEvent.click(button);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('OrderPaymentActions: envío', () => {
  it('registrar cobro en efectivo pide el motivo (10 a 500) y manda reason con su Idempotency-Key', async () => {
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    writeReason('corto');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    expect(api.registerCashPayment).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Registrar cobro' })).toHaveAttribute('aria-disabled', 'true');

    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    await waitFor(() =>
      expect(api.registerCashPayment).toHaveBeenCalledWith('abcdef123456', { reason: REASON }, expect.any(String)),
    );
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Cobro en efectivo registrado'));
  });

  it('registrar impago manda reason', async () => {
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar impago' }));
    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar impago', hidden: false }));
    await waitFor(() =>
      expect(api.registerUnpaidPayment).toHaveBeenCalledWith('abcdef123456', { reason: REASON }, expect.any(String)),
    );
  });

  it('confirmar la transferencia manda received: true', async () => {
    renderActions({ paymentMethodDetail: 'transfer' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar transferencia recibida' }));
    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar transferencia' }));
    await waitFor(() =>
      expect(api.confirmTransfer).toHaveBeenCalledWith(
        'abcdef123456',
        { received: true, reason: REASON },
        expect.any(String),
      ),
    );
  });

  it('marcarla no recibida manda received: false', async () => {
    renderActions({ paymentMethodDetail: 'transfer' });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como no recibida' }));
    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como no recibida', hidden: false }));
    await waitFor(() =>
      expect(api.confirmTransfer).toHaveBeenCalledWith(
        'abcdef123456',
        { received: false, reason: REASON },
        expect.any(String),
      ),
    );
  });

  it('el 409 del back queda en el modal y se limpia al editar el motivo', async () => {
    api.confirmTransfer.mockRejectedValue(new ApiError(409, ['La transferencia ya se confirmó: no se cambia']));
    renderActions({ paymentMethodDetail: 'transfer' });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como no recibida' }));
    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como no recibida', hidden: false }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La transferencia ya se confirmó');
    writeReason('Otro motivo distinto del anterior');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('doble click en confirmar manda un solo pedido', async () => {
    api.registerCashPayment.mockReturnValue(new Promise(() => undefined));
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    writeReason();
    const submit = screen.getByRole('button', { name: 'Registrar cobro' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(api.registerCashPayment).toHaveBeenCalledTimes(1));
  });

  it('un 200 que no guardó el motivo (el pago ya estaba así) avisa en vez de mostrar éxito', async () => {
    api.registerCashPayment.mockResolvedValue({
      order_id: 'abcdef123456',
      paymentResolutionNote: 'Motivo de otro admin',
    });
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    await waitFor(() =>
      expect(notify.info).toHaveBeenCalledWith('El pedido ya estaba cobrado: no se registró tu motivo'),
    );
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('el impago y la transferencia repetidos también avisan', async () => {
    api.registerUnpaidPayment.mockResolvedValue({ incident: { description: 'informado: Otro motivo' } });
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar impago' }));
    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar impago', hidden: false }));
    await waitFor(() =>
      expect(notify.info).toHaveBeenCalledWith('El pedido ya estaba informado como impago: no se registró tu motivo'),
    );
  });

  it('si otro admin ya decidió y el pedido se refresca, el modal sigue y muestra el 409', async () => {
    api.confirmTransfer.mockRejectedValue(new ApiError(409, ['La transferencia ya se confirmó: no se cambia']));
    const client = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <OrderPaymentActions order={order({ paymentMethodDetail: 'transfer' })} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como no recibida' }));
    writeReason();
    // El refetch trae el pedido ya cobrado antes de que llegue el error.
    rerender(
      <QueryClientProvider client={client}>
        <OrderPaymentActions order={order({ paymentMethodDetail: 'transfer', paymentStatus: 'paid' })} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como no recibida' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La transferencia ya se confirmó');
  });
});
