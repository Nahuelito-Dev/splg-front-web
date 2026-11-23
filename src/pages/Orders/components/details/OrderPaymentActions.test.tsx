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
}));
const finance = vi.hoisted(() => ({ listCashBoxes: vi.fn() }));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
vi.mock('../../../../services/api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../../../services/api/finance', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...finance,
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
  api.registerUnpaidPayment
    .mockReset()
    .mockImplementation((_id: string, body: { reason: string }) =>
      Promise.resolve({ incident: { description: `informado: ${body.reason}` } }),
    );
  finance.listCashBoxes
    .mockReset()
    .mockResolvedValue({ data: [{ cashBoxId: 'caja-1', name: 'Caja central' }], total: 1 });
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

const pickBox = async () => {
  await screen.findByRole('option', { name: 'Caja central' });
  fireEvent.change(screen.getByRole('combobox', { name: /Caja/ }), { target: { value: 'caja-1' } });
};

const writeReason = (value = REASON) =>
  fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), { target: { value } });

describe('OrderPaymentActions: qué se ofrece', () => {
  it('efectivo entregado y pendiente: cobro e impago', () => {
    renderActions({});
    expect(screen.getByRole('button', { name: 'Registrar cobro en efectivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar impago' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /transferencia/i })).not.toBeInTheDocument();
  });

  it('un pedido viejo por transferencia entregado y pendiente ofrece sólo resolverlo, con su rótulo', () => {
    renderActions({ paymentMethodDetail: 'transfer' });
    expect(screen.getByRole('button', { name: 'Registrar cobro de transferencia anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar impago de transferencia anterior' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar cobro en efectivo' })).not.toBeInTheDocument();
  });

  it('el cobro de una transferencia anterior no pide ni manda caja de efectivo', async () => {
    renderActions({ paymentMethodDetail: 'transfer' });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro de transferencia anterior' }));
    expect(screen.queryByRole('combobox', { name: /Caja/ })).not.toBeInTheDocument();
    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    await waitFor(() =>
      expect(api.registerCashPayment).toHaveBeenCalledWith('abcdef123456', { reason: REASON }, expect.any(String)),
    );
    expect(finance.listCashBoxes).not.toHaveBeenCalled();
  });

  it('un pedido viejo por transferencia no ofrece nada si no se entregó o el pago no está pendiente', () => {
    for (const over of [
      { paymentMethodDetail: 'transfer' as const, paymentStatus: 'failed' as const },
      { paymentMethodDetail: 'transfer' as const, status: 'out_for_delivery' as const },
    ]) {
      const { container, unmount } = renderActions(over);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
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
    await pickBox();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    await waitFor(() =>
      expect(api.registerCashPayment).toHaveBeenCalledWith(
        'abcdef123456',
        { reason: REASON, cashBoxId: 'caja-1' },
        expect.any(String),
      ),
    );
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Cobro en efectivo registrado'));
  });

  it('sólo ofrece cajas de efectivo', async () => {
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    await screen.findByRole('option', { name: 'Caja central' });
    expect(finance.listCashBoxes).toHaveBeenCalledWith(expect.anything(), { kind: 'cash' });
  });

  it('con cajas en la distribuidora, sin elegir una no manda nada y lo dice', async () => {
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    await screen.findByRole('option', { name: 'Caja central' });
    writeReason();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Elegí la caja donde entra el efectivo');
    expect(api.registerCashPayment).not.toHaveBeenCalled();
  });

  it('sin cajas en la distribuidora no pide caja y cobra sin cashBoxId', async () => {
    finance.listCashBoxes.mockResolvedValue({ data: [], total: 0 });
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    await waitFor(() => expect(finance.listCashBoxes).toHaveBeenCalled());
    writeReason();
    expect(screen.queryByRole('combobox', { name: /Caja/ })).not.toBeInTheDocument();
    // Mientras las cajas cargan el envío espera: se reintenta hasta que la lista (vacía) llega.
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
      expect(api.registerCashPayment).toHaveBeenCalledWith('abcdef123456', { reason: REASON }, expect.any(String));
    });
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

  it('el 409 del back queda en el modal y se limpia al editar el motivo', async () => {
    api.registerCashPayment.mockRejectedValue(new ApiError(409, ['El pedido ya se cobró: no se cambia']));
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    writeReason();
    await pickBox();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El pedido ya se cobró');
    writeReason('Otro motivo distinto del anterior');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('doble click en confirmar manda un solo pedido', async () => {
    api.registerCashPayment.mockReturnValue(new Promise(() => undefined));
    renderActions({});
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    writeReason();
    await pickBox();
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
    await pickBox();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    await waitFor(() =>
      expect(notify.info).toHaveBeenCalledWith('El pedido ya estaba cobrado: no se registró tu motivo'),
    );
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('el impago repetido también avisa', async () => {
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
    api.registerCashPayment.mockRejectedValue(new ApiError(409, ['El pedido ya se cobró: no se cambia']));
    const client = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <OrderPaymentActions order={order({})} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro en efectivo' }));
    writeReason();
    await pickBox();
    // El refetch trae el pedido ya cobrado antes de que llegue el error.
    rerender(
      <QueryClientProvider client={client}>
        <OrderPaymentActions order={order({ paymentStatus: 'paid' })} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El pedido ya se cobró');
  });
});
