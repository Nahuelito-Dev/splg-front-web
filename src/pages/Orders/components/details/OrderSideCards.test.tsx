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

describe('OrderSideCards: cobro en efectivo', () => {
  it('muestra el estado, cuándo se confirmó y la nota de resolución', () => {
    renderCards(
      order({
        payment_method: 'cash',
        payment_url: undefined,
        paymentStatus: 'paid',
        paymentConfirmedAt: '2026-10-10T15:30:00.000Z',
        paymentResolutionNote: 'Transfirió al día siguiente',
      }),
    );
    expect(screen.getByText('Estado del cobro')).toBeInTheDocument();
    expect(screen.getByText('Cobrado')).toBeInTheDocument();
    expect(screen.getByText('Cobro confirmado')).toBeInTheDocument();
    expect(screen.getByText(/Transfirió al día siguiente/)).toBeInTheDocument();
  });

  it('un pedido sin confirmación no inventa quién ni cuándo', () => {
    renderCards(order({ payment_method: 'cash', payment_url: undefined, paymentStatus: 'pending' }));
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByText('Cobro confirmado')).toBeNull();
    expect(screen.queryByText('Confirmado por')).toBeNull();
    expect(screen.queryByText(/Nota de resolución/)).toBeNull();
  });
});

describe('OrderSideCards: resolución del impago', () => {
  it('una pérdida no muestra «Cobro confirmado» y sí cuándo se dio por perdida y la nota', () => {
    renderCards(
      order({
        payment_method: 'cash',
        payment_url: undefined,
        paymentStatus: 'written_off',
        paymentConfirmedAt: null,
        paymentConfirmedBy: null,
        paymentResolvedAt: '2026-10-11T12:00:00.000Z',
        paymentResolvedBy: 'u-9',
        paymentResolutionNote: 'No atiende hace un mes',
      }),
    );
    expect(screen.queryByText('Cobro confirmado')).toBeNull();
    expect(screen.queryByText('Confirmado por')).toBeNull();
    expect(screen.getByText('Dado por perdido')).toBeInTheDocument();
    expect(screen.getByText('Resuelto por')).toBeInTheDocument();
    expect(screen.getByText(/No atiende hace un mes/)).toBeInTheDocument();
  });

  it('un impago cobrado después muestra «Cobrado después»', () => {
    renderCards(
      order({
        payment_method: 'cash',
        payment_url: undefined,
        paymentStatus: 'paid',
        paymentConfirmedAt: '2026-10-11T12:00:00.000Z',
        paymentResolvedAt: '2026-10-11T12:00:00.000Z',
      }),
    );
    expect(screen.getByText('Cobrado después')).toBeInTheDocument();
    expect(screen.getByText('Cobro confirmado')).toBeInTheDocument();
  });
});
