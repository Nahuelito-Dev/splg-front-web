import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { mutation, ok } from '../../../../test/pageTest';
import { OrderRefunds } from './OrderRefunds';
import { mayHaveRefunds } from './refundsAvailability';

const state = vi.hoisted(() => ({
  refunds: undefined as unknown,
  retry: undefined as unknown,
  enabledArg: undefined as unknown,
}));
vi.mock('../../../../hooks', () => ({ usePermissions: () => ({ canOperate: true, operateHint: undefined }) }));
vi.mock('../../../../services/queries/refunds', () => ({
  useOrderRefunds: (_id: string, enabled: boolean) => {
    state.enabledArg = enabled;
    return state.refunds;
  },
  useRetryOrderRefunds: () => state.retry,
}));
vi.mock('../../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const order = (over: Record<string, unknown> = {}) =>
  ({ order_id: 'o-1', paymentMethodDetail: 'mercadopago', expressSurchargeAmount: 0, ...over }) as unknown as Order;
const refund = (over: Record<string, unknown> = {}) => ({
  refundId: 'r-1',
  kind: 'full',
  amount: 2000,
  status: 'failed',
  errorMessage: 'MP caído',
  refundedAt: null,
  ...over,
});

afterEach(cleanup);

describe('OrderRefunds', () => {
  it('sólo un pedido con pago en línea o express puede tener reintegros', () => {
    expect(mayHaveRefunds(order())).toBe(true);
    expect(mayHaveRefunds(order({ paymentMethodDetail: 'cash', expressSurchargeAmount: 1500 }))).toBe(true);
    expect(mayHaveRefunds(order({ paymentMethodDetail: 'cash' }))).toBe(false);
  });

  it('en efectivo no consulta nada ni dibuja nada', () => {
    state.refunds = ok(undefined);
    state.retry = mutation();
    const { container } = render(<OrderRefunds order={order({ paymentMethodDetail: 'cash' })} />);
    expect(state.enabledArg).toBe(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('una devolución fallida muestra el error y permite reintentar el pedido', () => {
    state.refunds = ok([refund()]);
    state.retry = mutation();
    render(<OrderRefunds order={order()} />);
    expect(screen.getByText('MP caído')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar devolución' }));
    expect((state.retry as ReturnType<typeof mutation>).mutate.mock.calls[0][0]).toBe('o-1');
  });

  it('una reintegrada no ofrece reintento y dice cuándo se devolvió', () => {
    state.refunds = ok([refund({ status: 'succeeded', errorMessage: null, refundedAt: '2026-10-17T12:00:00.000Z' })]);
    state.retry = mutation();
    render(<OrderRefunds order={order()} />);
    expect(screen.queryByRole('button', { name: 'Reintentar devolución' })).not.toBeInTheDocument();
    expect(screen.getByText(/Devuelto el/)).toBeInTheDocument();
  });

  it('si no se pudieron cargar lo avisa', () => {
    state.refunds = { data: undefined, error: new Error('x') };
    state.retry = mutation();
    render(<OrderRefunds order={order()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
