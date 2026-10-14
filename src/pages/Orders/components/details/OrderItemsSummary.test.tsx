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
});
