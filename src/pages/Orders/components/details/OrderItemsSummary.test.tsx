import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { OrderItemsSummary } from './OrderItemsSummary';

afterEach(cleanup);

const order = (over: Partial<Order>) =>
  ({
    order_id: 'o-1',
    payment_method: 'online',
    paymentMethodDetail: 'transfer',
    total_amount: 1000,
    subtotal_items: 1000,
    paymentSurchargeAmount: 0,
    paymentSurchargePercentage: null,
    expressSurchargeAmount: 0,
    deliveryMode: 'standard',
    zone_surcharge: null,
    order_items: [],
    ...over,
  }) as unknown as Order;

describe('OrderItemsSummary: medio de pago', () => {
  it('muestra el medio real: una transferencia no es «Online»', () => {
    render(<OrderItemsSummary order={order({})} />);
    expect(screen.getByText('Transferencia')).toBeInTheDocument();
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('MercadoPago y efectivo también', () => {
    render(<OrderItemsSummary order={order({ paymentMethodDetail: 'mercadopago' })} />);
    expect(screen.getByText('MercadoPago')).toBeInTheDocument();
    cleanup();
    render(<OrderItemsSummary order={order({ payment_method: 'cash', paymentMethodDetail: 'cash' })} />);
    expect(screen.getByText('Efectivo')).toBeInTheDocument();
  });

  it('el recargo se nombra por el medio de pago y con el % que informa el back', () => {
    const conRecargo = { paymentSurchargeAmount: 100, paymentSurchargePercentage: 10 };
    render(<OrderItemsSummary order={order(conRecargo)} />);
    expect(screen.getByText('Recargo por transferencia (10 %)')).toBeInTheDocument();
    cleanup();
    render(
      <OrderItemsSummary
        order={order({ ...conRecargo, paymentMethodDetail: 'mercadopago', paymentSurchargePercentage: 7.5 })}
      />,
    );
    expect(screen.getByText('Recargo por Mercado Pago (7,5 %)')).toBeInTheDocument();
    expect(screen.queryByText(/pago online/)).not.toBeInTheDocument();
  });

  it('no deduce el recargo del total: sin monto informado no hay línea, y el express no se mezcla', () => {
    render(
      <OrderItemsSummary
        order={order({
          total_amount: 3500,
          subtotal_items: 2000,
          paymentSurchargeAmount: 0,
          deliveryMode: 'express',
          expressSurchargeAmount: 1500,
        })}
      />,
    );
    expect(screen.queryByText(/Recargo por transferencia/)).not.toBeInTheDocument();
    expect(screen.getByText('Recargo express')).toBeInTheDocument();
  });
});
