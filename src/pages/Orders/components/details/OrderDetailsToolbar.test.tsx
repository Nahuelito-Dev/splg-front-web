import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supportMode } from '../../../../services/api/supportMode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../services/api/errors';
import type { Order } from '../../../../services/api/types';
import { OrderDetailsToolbar } from './OrderDetailsToolbar';

const permissions = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({
  updateOrderStatus: vi.fn(),
  confirmOrderDelivery: vi.fn(),
}));
const pdfApi = vi.hoisted(() => ({ downloadPdf: vi.fn() }));
const notifications = vi.hoisted(() => ({
  confirm: vi.fn(() => Promise.resolve(true)),
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('../../../../features/chat/inbox/MessageButton', () => ({ MessageButton: () => null }));
vi.mock('../../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
vi.mock('../../../../services/api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  updateOrderStatus: api.updateOrderStatus,
  confirmOrderDelivery: api.confirmOrderDelivery,
}));
vi.mock('../../../../services/api/pdfs', () => ({ downloadPdf: pdfApi.downloadPdf }));
vi.mock('../../../../utils/fileSource', () => ({ openFileSource: vi.fn(() => true), saveFileSource: vi.fn() }));
vi.mock('../../../../utils/notifications', () => ({
  confirm: notifications.confirm,
  notify: notifications.notify,
  isConfirmOpen: vi.fn(() => false),
  subscribeConfirmOpen: vi.fn(() => () => undefined),
}));

afterEach(cleanup);
beforeEach(() => {
  permissions.mockReturnValue({ canWrite: true, writeHint: undefined, canOperate: true, operateHint: undefined });
  pdfApi.downloadPdf.mockReset().mockResolvedValue({ blob: new Blob(['x']), filename: 'x.pdf' });
  api.updateOrderStatus.mockReset().mockResolvedValue({ order_id: 'abcdef123456' });
  api.confirmOrderDelivery.mockReset().mockResolvedValue({ order_id: 'abcdef123456' });
  notifications.confirm.mockClear().mockResolvedValue(true);
  notifications.notify.success.mockClear();
  notifications.notify.error.mockClear();
  notifications.notify.info.mockClear();
});

const HINT = 'Elegí una distribuidora en «Ver como» para operar';
const order = (status: Order['status'] = 'accepted', paymentStatus?: Order['paymentStatus']) =>
  ({
    order_id: 'abcdef123456',
    status,
    paymentStatus,
    created_at: '2026-10-01T13:00:00.000Z',
    delivery_id: null,
  }) as unknown as Order;

const renderToolbar = (status: Order['status'] = 'accepted', paymentStatus?: Order['paymentStatus']) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OrderDetailsToolbar order={order(status, paymentStatus)} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** Las acciones de segundo orden viven en el menú ⋮ del encabezado. */
const clickMenu = (name: string | RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
  fireEvent.click(screen.getByRole('menuitem', { name }));
};

describe('OrderDetailsToolbar: permisos', () => {
  const withoutDistributor = () =>
    permissions.mockReturnValue({ canWrite: false, writeHint: undefined, canOperate: false, operateHint: HINT });

  it('el administrador general sin distribuidora elegida no puede operar un pedido: la API contesta 400', () => {
    withoutDistributor();
    for (const status of ['pending', 'accepted', 'out_for_delivery'] as const) {
      renderToolbar(status);
      const headerButtons = screen.getAllByRole('button');
      fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
      const operations = [...headerButtons, ...screen.getAllByRole('menuitem')].filter((button) =>
        /Asignar chofer|Reasignar chofer|Cancelar pedido|Marcar|Volver a|Avisar llegada|Confirmar entrega/.test(
          button.textContent ?? '',
        ),
      );
      expect(operations.length).toBeGreaterThan(0);
      for (const button of operations) {
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAttribute('title', HINT);
      }
      cleanup();
    }
  });

  it('un botón bloqueado no abre nada ni llama a la API', () => {
    withoutDistributor();
    renderToolbar('out_for_delivery');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar entrega/ }));
    clickMenu('Marcar como entregado');
    clickMenu(/Cancelar pedido/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(notifications.confirm).not.toHaveBeenCalled();
    expect(api.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('sin distribuidora elegida el remito se ve pero queda bloqueado (el back la necesita)', () => {
    withoutDistributor();
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    expect(screen.getByRole('menuitem', { name: /Remito \(PDF\)/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('con distribuidora elegida las acciones están habilitadas y sin aviso', () => {
    renderToolbar();
    const assign = screen.getByRole('button', { name: /Asignar chofer/ });
    expect(assign).not.toHaveAttribute('aria-disabled');
    expect(assign).not.toHaveAttribute('title');
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    expect(screen.getByRole('menuitem', { name: /Cancelar pedido/ })).not.toHaveAttribute('aria-disabled');
  });
});

describe('OrderDetailsToolbar: Mercado Pago sin pagar (F9)', () => {
  const renderMp = (paymentStatus: Order['paymentStatus']) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <OrderDetailsToolbar
            order={{ ...order('pending', paymentStatus), paymentMethodDetail: 'mercadopago' } as unknown as Order}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('impago: asignar chofer queda bloqueado con el motivo y no abre el modal', () => {
    renderMp('pending');
    const assign = screen.getByRole('button', { name: /Asignar chofer/ });
    expect(assign).toHaveAttribute('aria-disabled', 'true');
    expect(assign).toHaveAttribute('title', expect.stringContaining('Mercado Pago') as string);
    fireEvent.click(assign);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pagado: se asigna como cualquier pedido', () => {
    renderMp('paid');
    expect(screen.getByRole('button', { name: /Asignar chofer/ })).not.toHaveAttribute('aria-disabled');
  });
});

describe('OrderDetailsToolbar: PDF', () => {
  it('el remito se pide al back y el recibo no se ofrece sin cobro', () => {
    renderToolbar('delivered', 'unpaid');
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    expect(screen.getByRole('menuitem', { name: /Remito \(PDF\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Recibo \(PDF\)/ })).not.toBeInTheDocument();
  });

  it('el recibo se ofrece con el pedido cobrado y pide el PDF del recibo', async () => {
    renderToolbar('delivered', 'paid');
    clickMenu(/Recibo \(PDF\)/);
    await waitFor(() =>
      expect(pdfApi.downloadPdf).toHaveBeenCalledWith({ kind: 'order-recibo', orderId: 'abcdef123456' }),
    );
  });

  it('el recibo no se ofrece en un pedido cancelado, aunque figure cobrado', () => {
    renderToolbar('cancelled', 'paid');
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    expect(screen.queryByRole('menuitem', { name: /Recibo \(PDF\)/ })).not.toBeInTheDocument();
  });
});

describe('OrderDetailsToolbar: entrega manual', () => {
  it('Marcar como entregado pide motivo y manda status + reason', async () => {
    renderToolbar('out_for_delivery');
    clickMenu('Marcar como entregado');
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
    clickMenu('Marcar como entregado');
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
    clickMenu('Marcar como entregado');
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
    clickMenu('Marcar como entregado');
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
    clickMenu('Volver a pendiente');
    await waitFor(() => expect(notifications.confirm).toHaveBeenCalled());
    await waitFor(() => expect(api.updateOrderStatus).toHaveBeenCalledWith('abcdef123456', { status: 'pending' }));
  });
});

describe('OrderDetailsToolbar: PDF en modo soporte', () => {
  const READ_ONLY = 'Modo soporte: sólo lectura';
  const support = (scope: ('exports' | 'files')[]) => {
    supportMode.reset();
    supportMode.update({ id: 's-1', status: 'active', scope, distributorName: 'Gas Norte' } as never);
    permissions.mockReturnValue({
      canWrite: false,
      writeHint: READ_ONLY,
      canOperate: false,
      operateHint: READ_ONLY,
      readOnly: true,
    });
  };
  afterEach(() => supportMode.reset());

  it('sin el alcance «exportes» el remito queda apagado con el motivo del alcance', () => {
    support([]);
    renderToolbar('delivered', 'unpaid');
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    const item = screen.getByRole('menuitem', { name: /Remito \(PDF\)/ });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAttribute('title', expect.stringContaining('no incluye exportes'));
  });

  it('con el alcance «exportes» el remito se baja aunque sea sólo lectura', async () => {
    support(['exports']);
    renderToolbar('delivered', 'unpaid');
    clickMenu(/Remito \(PDF\)/);
    await waitFor(() =>
      expect(pdfApi.downloadPdf).toHaveBeenCalledWith({ kind: 'order-remito', orderId: 'abcdef123456' }),
    );
  });
});
