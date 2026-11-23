import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../services/api/types';

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ operateHint: undefined, needsDistributor: true, canWrite: true }),
}));
vi.mock('../../../services/queries/orders', () => ({
  useOrder: () => ({ data: undefined, error: null, refetch: vi.fn() }),
}));

import { OrderItemsSummary } from './details/OrderItemsSummary';
import { OrderQuickDrawer } from './OrderQuickDrawer';

afterEach(cleanup);

const PHOTO = 'https://fotos.test/garrafa-10.jpg';

const order = (photoUrl: string | null) =>
  ({
    order_id: 'o-1',
    status: 'pending',
    payment_method: 'cash',
    paymentMethodDetail: 'cash',
    total_amount: 1000,
    subtotal_items: 1000,
    paymentSurchargeAmount: 0,
    paymentSurchargePercentage: null,
    expressSurchargeAmount: 0,
    deliveryMode: 'standard',
    zone_surcharge: null,
    containerChargeAmount: 0,
    order_items: [
      {
        quantity: 2,
        unit_price: 500,
        subtotal: 1000,
        gas_cylinder: {
          gas_cylinder_id: 'g-1',
          type: '10kg',
          weight: 10,
          price: 500,
          description: null,
          photoUrl,
        },
      },
    ],
  }) as unknown as Order;

describe('OrderItemsSummary: foto del producto', () => {
  it('muestra la miniatura del producto en el renglón', () => {
    const { container } = render(<OrderItemsSummary order={order(PHOTO)} />);
    expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto queda el ícono de siempre', () => {
    const { container } = render(<OrderItemsSummary order={order(null)} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('OrderQuickDrawer: foto del producto', () => {
  const draw = (photo: string | null) =>
    render(
      <MemoryRouter>
        <OrderQuickDrawer open onClose={() => undefined} order={order(photo)} />
      </MemoryRouter>,
    );

  it('muestra la miniatura del producto en los ítems', () => {
    draw(PHOTO);
    expect(document.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto no dibuja imagen', () => {
    draw(null);
    expect(document.querySelector('img')).toBeNull();
  });
});
