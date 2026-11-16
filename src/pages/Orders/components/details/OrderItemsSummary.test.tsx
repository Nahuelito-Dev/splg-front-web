import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { formatCurrency } from '../../../../utils/format';
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
    containerChargeAmount: 0,
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

/** El importe como lo lee testing-library: el espacio duro de `Intl` queda como espacio común. */
const money = (value: number) => formatCurrency(value).replace(/\s/g, ' ');

describe('OrderItemsSummary: envases (F35)', () => {
  it('con envases cobrados muestra «Envases (N)» con el importe del back', () => {
    render(
      <OrderItemsSummary
        order={order({
          containerChargeAmount: 30000,
          order_items: [
            { quantity: 2, unit_price: 100, subtotal: 200, containersCharged: 2, containerUnitPrice: 10000 },
            { quantity: 1, unit_price: 100, subtotal: 100, containersCharged: 1, containerUnitPrice: 10000 },
          ] as unknown as Order['order_items'],
        })}
      />,
    );
    const row = screen.getByText('Envases (3)').closest('div');
    expect(row).toHaveTextContent(money(30000));
  });

  it('sin envases cobrados no hay línea', () => {
    render(<OrderItemsSummary order={order({})} />);
    expect(screen.queryByText(/Envases/)).not.toBeInTheDocument();
  });
});

describe('OrderItemsSummary: vacías recibidas (F35)', () => {
  const withEmpties = (emptiesExpected: number, emptiesReceived: number | null) =>
    order({
      order_items: [
        { quantity: 2, unit_price: 100, subtotal: 200, emptiesExpected, emptiesReceived },
      ] as unknown as Order['order_items'],
    });

  it('una respuesta sin los campos de vacías no muestra la línea', () => {
    render(
      <OrderItemsSummary
        order={order({
          order_items: [{ quantity: 2, unit_price: 100, subtotal: 200 }] as unknown as Order['order_items'],
        })}
      />,
    );
    expect(screen.queryByText(/Vacías/)).not.toBeInTheDocument();
  });

  it('sin declaración del chofer no hay línea', () => {
    render(<OrderItemsSummary order={withEmpties(2, null)} />);
    expect(screen.queryByText(/Vacías/)).not.toBeInTheDocument();
  });

  it('completa: muestra X de Y sin resaltar', () => {
    render(<OrderItemsSummary order={withEmpties(2, 2)} />);
    const line = screen.getByText('Vacías: recibidas 2 de 2');
    expect(line).toHaveClass('text-muted');
    expect(line).not.toHaveClass('text-warn');
  });

  it('faltante: muestra X de Y resaltado', () => {
    render(<OrderItemsSummary order={withEmpties(2, 1)} />);
    const line = screen.getByText('Vacías: recibidas 1 de 2');
    expect(line).toHaveClass('text-warn');
    expect(line).not.toHaveClass('text-muted');
  });

  it('declaró cero de las esperadas: también es faltante', () => {
    render(<OrderItemsSummary order={withEmpties(2, 0)} />);
    expect(screen.getByText('Vacías: recibidas 0 de 2')).toHaveClass('text-warn');
  });

  it('con cero esperadas no hay línea, aunque venga una declaración', () => {
    render(<OrderItemsSummary order={withEmpties(0, 0)} />);
    expect(screen.queryByText(/Vacías/)).not.toBeInTheDocument();
  });
});
