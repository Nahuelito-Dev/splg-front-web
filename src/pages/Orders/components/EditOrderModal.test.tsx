import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../services/api/types';

const queries = vi.hoisted(() => ({ catalog: undefined as unknown, addresses: undefined as unknown }));
vi.mock('../../../services/queries/gasCylinders', () => ({ useGasCylinders: () => ({ data: queries.catalog }) }));
vi.mock('../../../services/queries/userAddresses', () => ({ useUserAddresses: () => ({ data: queries.addresses }) }));
vi.mock('../../../services/queries/timeSlots', () => ({ useTimeSlots: () => ({ data: [] }) }));
vi.mock('../../../services/queries/orders', () => ({ useUpdateOrder: () => ({ mutate: vi.fn(), isPending: false }) }));

import { EditOrderModal } from './EditOrderModal';

afterEach(cleanup);

const ORDER = {
  order_id: 'o-1',
  customer: { user_id: 'u-1' },
  delivery_address: { address_id: 'a-1' },
  scheduledDate: null,
  customer_notes: '',
  order_items: [{ quantity: 2, gas_cylinder: { gas_cylinder_id: 'g-old', type: 'Garrafa vieja' } }],
} as unknown as Order;

describe('EditOrderModal', () => {
  it('no dibuja los selects de dirección y garrafa hasta tener sus opciones', () => {
    queries.catalog = undefined;
    queries.addresses = undefined;
    render(<EditOrderModal order={ORDER} onClose={vi.fn()} />);
    expect(screen.queryByLabelText('Dirección de entrega')).toBeNull();
    expect(screen.queryByLabelText('Garrafa')).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('un producto del pedido que no está en el catálogo activo igual es opción y queda elegido', () => {
    queries.catalog = { rows: [{ gas_cylinder_id: 'g-new', type: 'Garrafa 10kg', price: 100, isActive: true }] };
    queries.addresses = [{ address_id: 'a-1', street: 'Calle 1', city: 'Posadas' }];
    render(<EditOrderModal order={ORDER} onClose={vi.fn()} />);
    const select = screen.getByLabelText('Garrafa');
    expect(within(select).getByRole('option', { name: /Garrafa vieja/ })).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe('g-old');
  });
});
