import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { OrderSideCards } from './OrderSideCards';

afterEach(cleanup);

const URL = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123';

const order = (over: Partial<Order>): Order =>
  ({
    order_id: 'o-1',
    status: 'pending',
    payment_method: 'online',
    payment_url: URL,
    total_amount: 1000,
    depositAmount: 0,
    customer: null,
    delivery_address: null,
    delivery_name: null,
    zone_surcharge: null,
    order_items: [],
    ...over,
  }) as Order;

const renderCards = (o: Order) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OrderSideCards order={o} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('OrderSideCards: enlace de pago', () => {
  it('pedido online sin cerrar muestra el enlace con copiar y abrir', () => {
    renderCards(order({}));
    expect(screen.getByText(URL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir/ })).toHaveAttribute('href', URL);
  });

  it('en efectivo, entregado o cancelado no se ofrece', () => {
    renderCards(order({ payment_method: 'cash' }));
    expect(screen.queryByText(URL)).not.toBeInTheDocument();
    cleanup();
    renderCards(order({ status: 'delivered' }));
    expect(screen.queryByText(URL)).not.toBeInTheDocument();
    cleanup();
    renderCards(order({ status: 'cancelled' }));
    expect(screen.queryByText(URL)).not.toBeInTheDocument();
  });
});
