import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { OrderSideCards } from './OrderSideCards';

vi.mock('./OrderRefunds', () => ({ OrderRefunds: () => null }));

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

  it('un cobro registrado por el administrador muestra «Cobro registrado»', () => {
    renderCards(
      order({
        payment_method: 'cash',
        payment_url: undefined,
        paymentStatus: 'paid',
        paymentConfirmedAt: '2026-10-11T12:00:00.000Z',
        paymentResolvedAt: '2026-10-11T12:00:00.000Z',
      }),
    );
    expect(screen.getByText('Cobro registrado')).toBeInTheDocument();
    expect(screen.getByText('Cobro confirmado')).toBeInTheDocument();
  });
});

describe('OrderSideCards: transferencia', () => {
  const transfer = (over: Partial<Order>) =>
    order({ payment_method: 'online', payment_url: undefined, paymentMethodDetail: 'transfer', ...over });

  it('muestra el medio real y una transferencia no recibida como «No recibida», con su nota', () => {
    renderCards(
      transfer({
        status: 'delivered',
        paymentStatus: 'failed',
        paymentResolvedAt: '2026-10-11T12:00:00.000Z',
        paymentResolutionNote: 'No figura el crédito en el banco',
      }),
    );
    expect(screen.getByText('Transferencia')).toBeInTheDocument();
    expect(screen.getByText('No recibida')).toBeInTheDocument();
    expect(screen.getByText('Marcada como no recibida')).toBeInTheDocument();
    expect(screen.getByText(/No figura el crédito en el banco/)).toBeInTheDocument();
  });

  it('una transferencia confirmada es «Cobrado»', () => {
    renderCards(transfer({ paymentStatus: 'paid' }));
    expect(screen.getByText('Cobrado')).toBeInTheDocument();
    expect(screen.queryByText('No recibida')).toBeNull();
  });
});

describe('OrderSideCards: reintegro pendiente', () => {
  it('un pedido cobrado y cancelado avisa que hay que devolver el dinero', () => {
    renderCards(
      order({ status: 'cancelled', paymentStatus: 'paid', paymentMethodDetail: 'transfer', payment_url: undefined }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Reintegro pendiente');
    expect(screen.getByRole('status')).toHaveTextContent('no pasa por una pasarela');
  });

  it('con MercadoPago no avisa de un reintegro manual: lo devuelve el sistema y se ve en «Reintegros»', () => {
    renderCards(
      order({ status: 'cancelled', paymentStatus: 'paid', paymentMethodDetail: 'mercadopago', payment_url: undefined }),
    );
    expect(screen.queryByText(/Reintegro pendiente/)).toBeNull();
  });

  it('cancelado sin cobrar, o cobrado sin cancelar, no lo muestra', () => {
    renderCards(order({ status: 'cancelled', paymentStatus: 'pending', payment_url: undefined }));
    expect(screen.queryByText(/Reintegro pendiente/)).toBeNull();
    cleanup();
    renderCards(order({ status: 'delivered', paymentStatus: 'paid', payment_url: undefined }));
    expect(screen.queryByText(/Reintegro pendiente/)).toBeNull();
  });
});

describe('OrderSideCards: quién recibe', () => {
  it('muestra nombre, documento y relación cuando el cliente los indicó', () => {
    renderCards(
      order({ receiver: { name: 'María Gómez', document: '30123456', relationship: 'vecina' } } as Partial<Order>),
    );
    expect(screen.getByText('Quién recibe')).toBeInTheDocument();
    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    expect(screen.getByText('30123456')).toBeInTheDocument();
    expect(screen.getByText('vecina')).toBeInTheDocument();
  });

  it('sin datos (o ya anulados por el plazo de reclamo) no dibuja la sección', () => {
    renderCards(order({ receiver: null } as Partial<Order>));
    expect(screen.queryByText('Quién recibe')).not.toBeInTheDocument();
  });
});

describe('OrderSideCards: modalidad express', () => {
  it('muestra la modalidad y el recargo', () => {
    renderCards(order({ deliveryMode: 'express', expressSurchargeAmount: 1500, payment_url: undefined }));
    expect(screen.getByText('Express')).toBeInTheDocument();
    expect(screen.getByText('Recargo express')).toBeInTheDocument();
  });

  it('un express que pasó al reparto común lo dice y marca el recargo como descontado', () => {
    renderCards(
      order({
        deliveryMode: 'standard',
        expressSurchargeAmount: 1500,
        expressDegradedAt: '2026-10-17T15:00:00.000Z',
        payment_url: undefined,
      }),
    );
    expect(screen.getByText('Pasó a reparto común')).toBeInTheDocument();
    expect(screen.getByText(/descontado/)).toBeInTheDocument();
  });
});
