import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { mutation, ok } from '../../../../test/pageTest';
import { OrderMercadoPagoPayment } from './OrderMercadoPagoPayment';

const state = vi.hoisted(() => ({
  result: undefined as unknown,
  enabledArg: undefined as unknown,
  release: undefined as unknown,
  canOperate: true,
}));
vi.mock('../../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canOperate: state.canOperate, operateHint: undefined }),
}));
vi.mock('../../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../../services/queries/orders', () => ({
  useOrderPaymentState: (_id: string, enabled: boolean) => {
    state.enabledArg = enabled;
    return state.result;
  },
  useReleaseFraudHold: () => state.release,
}));

const order = (method = 'mercadopago') => ({ order_id: 'o-1', paymentMethodDetail: method }) as unknown as Order;
const pago = (over: Record<string, unknown> = {}) => ({
  orderId: 'o-1',
  paymentStatus: 'rejected',
  paymentStatusDetail: 'cc_rejected_insufficient_amount',
  paymentStatusLabel: 'Fondos insuficientes en el medio de pago',
  canRetry: true,
  paymentUrl: 'https://mp.test/x',
  history: [],
  ...over,
});

afterEach(() => {
  cleanup();
  state.canOperate = true;
});

beforeEach(() => {
  state.release = mutation();
});

describe('OrderMercadoPagoPayment', () => {
  it('un pedido en efectivo no consulta ni dibuja nada', () => {
    state.result = ok(undefined);
    const { container } = render(<OrderMercadoPagoPayment order={order('cash')} />);
    expect(state.enabledArg).toBe(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el estado con su motivo y avisa que el cliente puede reintentar', () => {
    state.result = ok(pago());
    render(<OrderMercadoPagoPayment order={order()} />);
    expect(state.enabledArg).toBe(true);
    expect(screen.getByText('Fondos insuficientes en el medio de pago')).toBeInTheDocument();
    expect(screen.getByText('cc_rejected_insufficient_amount')).toBeInTheDocument();
    expect(screen.getByText(/todavía puede reintentar el pago/)).toBeInTheDocument();
  });

  it('un pago acreditado no ofrece reintento', () => {
    state.result = ok(
      pago({
        paymentStatus: 'approved',
        paymentStatusDetail: 'accredited',
        paymentStatusLabel: 'Pago acreditado',
        canRetry: false,
      }),
    );
    render(<OrderMercadoPagoPayment order={order()} />);
    expect(screen.getByText('Pago acreditado')).toBeInTheDocument();
    expect(screen.queryByText(/reintentar/)).not.toBeInTheDocument();
  });

  it('lista el historial con su origen, y marca el aviso que llegó fuera de orden', () => {
    state.result = ok(
      pago({
        paymentStatus: 'refunded',
        paymentStatusLabel: 'Pago devuelto',
        canRetry: false,
        history: [
          {
            status: 'approved',
            statusDetail: 'accredited',
            label: 'Pago acreditado',
            at: '2026-11-01T14:00:00.000Z',
            origin: 'webhook',
            applied: true,
            gatewayPaymentId: '9100000001',
          },
          {
            status: 'refunded',
            statusDetail: 'refunded',
            label: 'Pago devuelto',
            at: '2026-11-01T14:05:00.000Z',
            origin: 'reintegro',
            applied: true,
            gatewayPaymentId: '9100000001',
          },
          {
            status: 'approved',
            statusDetail: 'accredited',
            label: 'Pago acreditado',
            at: '2026-11-01T14:06:00.000Z',
            origin: 'conciliacion',
            applied: false,
            gatewayPaymentId: '9100000001',
          },
        ],
      }),
    );
    render(<OrderMercadoPagoPayment order={order()} />);
    expect(screen.getByText('Historial del pago (3)')).toBeInTheDocument();
    expect(screen.getByText(/Aviso de Mercado Pago/)).toBeInTheDocument();
    expect(screen.getByText(/Devolución pedida desde el sistema/)).toBeInTheDocument();
    expect(screen.getByText(/llegó fuera de orden y no cambió el estado/)).toBeInTheDocument();
  });

  it('un reclamo o contracargo se ven con el texto del back', () => {
    state.result = ok(
      pago({
        paymentStatus: 'charged_back',
        paymentStatusDetail: 'settled',
        paymentStatusLabel: 'Contracargo: el dinero quedó retenido',
        canRetry: false,
      }),
    );
    render(<OrderMercadoPagoPayment order={order()} />);
    expect(screen.getByText('Contracargo: el dinero quedó retenido')).toBeInTheDocument();
  });

  it('sin pagos de Mercado Pago todavía (estado nulo) no dibuja la tarjeta', () => {
    state.result = ok(pago({ paymentStatus: null, paymentStatusLabel: null }));
    const { container } = render(<OrderMercadoPagoPayment order={order()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('si no se puede leer el estado, lo dice', () => {
    state.result = { data: undefined, error: new Error('boom') };
    render(<OrderMercadoPagoPayment order={order()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el estado del pago');
  });

  describe('M-1: retención por alerta de fraude', () => {
    it('avisa que el pedido está retenido y ofrece liberarlo', () => {
      state.result = ok(pago({ paymentFraudHold: true }));
      render(<OrderMercadoPagoPayment order={order()} />);
      expect(screen.getByText('Retenido por alerta de fraude')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Liberar retención' })).toBeEnabled();
    });

    it('sin retención no hay alerta ni botón', () => {
      state.result = ok(pago({ paymentFraudHold: false }));
      render(<OrderMercadoPagoPayment order={order()} />);
      expect(screen.queryByText('Retenido por alerta de fraude')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Liberar retención' })).not.toBeInTheDocument();
    });

    it('liberar pide un motivo (mínimo 10 caracteres) y manda el motivo con el pedido', () => {
      state.result = ok(pago({ paymentFraudHold: true }));
      render(<OrderMercadoPagoPayment order={order()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Liberar retención' }));
      const campo = screen.getByRole('textbox');
      fireEvent.change(campo, { target: { value: 'corto' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Liberar retención' }).at(-1)!);
      expect((state.release as ReturnType<typeof mutation>).mutate).not.toHaveBeenCalled();

      fireEvent.change(campo, { target: { value: 'Verifiqué el pago con el cliente' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Liberar retención' }).at(-1)!);
      const [args] = (state.release as ReturnType<typeof mutation>).mutate.mock.calls[0];
      expect(args).toMatchObject({ id: 'o-1', reason: 'Verifiqué el pago con el cliente' });
    });

    it('sin permiso de operar el botón está apagado', () => {
      state.canOperate = false;
      state.result = ok(pago({ paymentFraudHold: true }));
      render(<OrderMercadoPagoPayment order={order()} />);
      expect(screen.getByRole('button', { name: 'Liberar retención' })).toBeDisabled();
    });
  });
});
