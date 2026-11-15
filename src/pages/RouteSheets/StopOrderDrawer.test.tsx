import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Claim, Order } from '../../services/api/types';
import { failed, loading, ok } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  order: undefined as unknown,
  claims: undefined as unknown,
  asked: [] as unknown[],
  claimsFor: [] as unknown[],
}));
vi.mock('../../services/queries/orders', () => ({
  useOrder: (id: string) => {
    state.asked.push(id);
    return state.order;
  },
  useOrderStatusHistory: () => ok([]),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: false }),
}));
vi.mock('../../services/queries/claims', () => ({
  useOrderClaims: (id: string) => {
    state.claimsFor.push(id);
    return state.claims;
  },
}));

import { StopOrderDrawer } from './StopOrderDrawer';

const ORDER_ID = '00000000-0000-4000-8000-000000000101';

const order = (over: Partial<Order> = {}) =>
  ({
    order_id: ORDER_ID,
    created_at: '2026-11-14T12:00:00.000Z',
    status: 'accepted',
    payment_method: 'cash',
    paymentMethodDetail: 'cash',
    paymentStatus: 'pending',
    total_amount: 25000,
    subtotal_items: 25000,
    paymentSurchargeAmount: 0,
    paymentSurchargePercentage: null,
    expressSurchargeAmount: 0,
    deliveryMode: 'standard',
    zone_surcharge: null,
    containerChargeAmount: 0,
    customer: { full_name: 'Ana Gómez', phone_number: '3764 123456', user_id: 'u-1' },
    delivery_address: { street: 'Mitre 123', city: 'Posadas', additional_instructions: 'Portón negro' },
    customer_notes: 'Tocar timbre',
    delivery_notes: null,
    order_items: [
      { quantity: 2, unit_price: 10000, subtotal: 20000, emptiesExpected: 2, gas_cylinder: { type: '10 kg' } },
      { quantity: 1, unit_price: 5000, subtotal: 5000, emptiesExpected: 1, gas_cylinder: { type: '15 kg' } },
    ],
    ...over,
  }) as unknown as Order;

const claim = (id: string, orderId: string, reason: string) =>
  ({ claim_id: id, order_id: orderId, reason, status: 'pending', createdAt: '2026-11-14T13:00:00.000Z' }) as Claim;

const draw = (orderId: string | null = ORDER_ID) =>
  render(
    <MemoryRouter>
      <StopOrderDrawer orderId={orderId} onClose={vi.fn()} />
    </MemoryRouter>,
  );

beforeEach(() => {
  state.order = ok(order());
  state.claims = ok([claim('c1', ORDER_ID, 'Garrafa con pérdida')]);
  state.asked = [];
  state.claimsFor = [];
});
afterEach(cleanup);

describe('StopOrderDrawer', () => {
  it('sin parada no abre ni pide nada', () => {
    draw(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(state.asked).toEqual([]);
  });

  it('muestra el pedido completo de la parada y lleva a su ficha', () => {
    draw();
    const panel = screen.getByRole('dialog');
    expect(state.asked).toContain(ORDER_ID);
    for (const text of [
      'Ana Gómez',
      '3764 123456',
      'Mitre 123, Posadas',
      'Portón negro',
      'Tocar timbre',
      '10 kg',
      '15 kg',
      '2 × ',
      'Historial',
    ]) {
      expect(within(panel).getAllByText(text, { exact: false }).length).toBeGreaterThan(0);
    }
    expect(within(panel).getByText('Envases a retirar').nextElementSibling).toHaveTextContent('3');
    const claims = within(panel).getByRole('region', { name: 'Reclamos del pedido' });
    expect(within(claims).getByRole('link', { name: /Garrafa con pérdida/ })).toHaveAttribute(
      'href',
      '/claims?claim=c1',
    );
    expect(state.claimsFor).toContain(ORDER_ID);
    expect(within(panel).getByRole('link', { name: /Ver el pedido completo/ })).toHaveAttribute(
      'href',
      `/orders/${ORDER_ID}`,
    );
  });

  it('el estado del pedido y el del pago no se repiten: «Pendiente» y «Sin pagar»; el pago dice el medio', () => {
    state.order = ok(order({ status: 'pending' }));
    state.claims = ok([]);
    draw();
    const panel = screen.getByRole('dialog');
    expect(within(panel).getAllByText('Pendiente')).toHaveLength(1);
    expect(within(panel).getByText('Sin pagar')).toBeInTheDocument();
    expect(within(panel).getByText('Pago').nextElementSibling).toHaveTextContent(/^Efectivo$/);
  });

  it('el total va con la letra del resto, con cifras tabulares (no monoespaciada)', () => {
    draw();
    // El primero es el del resumen de arriba; el segundo, el del desglose de `OrderItemsSummary`.
    const total = within(screen.getByRole('dialog')).getAllByText('Total')[0].nextElementSibling as HTMLElement;
    expect(total).not.toHaveClass('font-mono');
    expect(total.firstElementChild).toHaveClass('tabular-nums');
  });

  it('pagado lo dice; sin reclamos ni envases, también', () => {
    state.order = ok(order({ paymentStatus: 'paid', order_items: [] }));
    state.claims = ok([]);
    draw();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    expect(screen.getByText('Envases a retirar').nextElementSibling).toHaveTextContent('Ninguno');
    expect(screen.getByText('Sin reclamos.')).toBeInTheDocument();
  });

  it('mientras carga, el esqueleto; si falla, el error con reintento', () => {
    state.order = loading();
    const { unmount } = draw();
    expect(screen.getByRole('status', { name: 'Cargando detalle' })).toBeInTheDocument();
    unmount();
    state.order = failed();
    draw();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
