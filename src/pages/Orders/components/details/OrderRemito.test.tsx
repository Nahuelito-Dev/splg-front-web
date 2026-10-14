import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Distributor, Order } from '../../../../services/api/types';
import { OrderRemito } from './OrderRemito';

afterEach(cleanup);

const order = {
  order_id: '5baddc17-24e6-4a69-9e11-45f321956d60',
  status: 'delivered',
  payment_method: 'cash',
  paymentMethodDetail: 'cash',
  created_at: '2026-10-01T13:00:00.000Z',
  total_amount: 25000,
  subtotal_items: 22600,
  scheduledDate: null,
  delivery_window_start: null,
  delivery_window_end: null,
  delivery_name: 'Luis Gómez',
  zone_surcharge: { coverage_zone_id: 'z', name: 'Villa Lanús', type: 'fixed', value: 2400, amount: 2400 },
  customer: { user_id: 'u', full_name: 'Ana Pérez', phone_number: '3764000000', email: null },
  delivery_address: { address_id: 'a', street: 'Av. Mitre 123', city: 'Posadas' },
  order_items: [
    {
      quantity: 2,
      unit_price: 10000,
      subtotal: 20000,
      gas_cylinder: { gas_cylinder_id: 'g', type: '10kg', weight: 10, price: 11300, description: null },
    },
  ],
} as unknown as Order;

describe('OrderRemito', () => {
  it('muestra distribuidora, cliente, ítems, totales, código y firma', () => {
    const distributor = { name: 'Gas Sur', legal_name: 'Gas Sur SRL', tax_id: '30-1234' } as Distributor;
    render(<OrderRemito order={order} distributor={distributor} />);
    expect(screen.getByText('Gas Sur SRL')).toBeInTheDocument();
    expect(screen.getByText('CUIT 30-1234')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('10kg')).toBeInTheDocument();
    expect(screen.getAllByText('#956D60').length).toBeGreaterThan(0);
    expect(screen.getByText(order.order_id)).toBeInTheDocument();
    expect(screen.getByText(/Recargo zona «Villa Lanús»/)).toBeInTheDocument();
    expect(screen.getByText(/Firma y aclaración de quien recibe/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('#');
  });

  it('sin distribuidora omite el membrete y no rompe', () => {
    render(<OrderRemito order={order} distributor={undefined} />);
    expect(screen.queryByText(/CUIT/)).not.toBeInTheDocument();
    expect(screen.getByText('Remito')).toBeInTheDocument();
  });

  it('el precio y el subtotal del renglón salen de lo vendido, no del catálogo', () => {
    render(<OrderRemito order={order} distributor={undefined} />);
    const row = screen.getByText('10kg').closest('tr') as HTMLElement;
    expect(row).toHaveTextContent('10.000');
    expect(row).toHaveTextContent('20.000');
    expect(row).not.toHaveTextContent('11.300');
    expect(row).not.toHaveTextContent('22.600');
  });

  it('un pedido cancelado lleva la marca ANULADO; uno entregado no', () => {
    const { rerender } = render(<OrderRemito order={order} distributor={undefined} />);
    expect(screen.queryByText('Anulado')).not.toBeInTheDocument();
    rerender(<OrderRemito order={{ ...order, status: 'cancelled' }} distributor={undefined} />);
    expect(screen.getByText('Anulado')).toBeInTheDocument();
  });

  it('no imprime recargo de zona cuando es cero', () => {
    const noSurcharge = { ...order, zone_surcharge: { ...order.zone_surcharge, amount: 0 } } as unknown as Order;
    render(<OrderRemito order={noSurcharge} distributor={undefined} />);
    expect(screen.queryByText(/Recargo zona/)).not.toBeInTheDocument();
  });

  it('la forma de pago es el medio real: una transferencia no sale como «Online»', () => {
    render(
      <OrderRemito
        order={{ ...order, payment_method: 'online', paymentMethodDetail: 'transfer' } as Order}
        distributor={undefined}
      />,
    );
    expect(screen.getByText('Transferencia')).toBeInTheDocument();
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('el recargo del medio de pago se nombra por la transferencia, no como «pago online»', () => {
    render(
      <OrderRemito
        order={{ ...order, total_amount: 27500, paymentMethodDetail: 'transfer' } as Order}
        distributor={undefined}
      />,
    );
    expect(screen.getByText('Recargo por transferencia')).toBeInTheDocument();
    expect(screen.queryByText(/pago online/)).not.toBeInTheDocument();
  });
});
