import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { OrderPartiesCard } from './OrderPartiesCard';

afterEach(cleanup);

const order = (photoUrl: string | null, assignmentMethod?: Order['assignmentMethod']) =>
  ({
    assignmentMethod,
    order_id: 'o-1',
    customer: null,
    delivery_id: 'd-1',
    delivery_name: 'Beto',
    vehicle: { car_id: 'car-1', patent: 'AB123CD', brand: 'Ford', model: 'Cargo', photoUrl },
  }) as unknown as Order;

describe('OrderPartiesCard: foto del vehículo', () => {
  it('muestra la foto del vehículo del pedido', () => {
    const { container } = render(<OrderPartiesCard order={order('https://fotos.test/cargo.jpg')} />);
    expect(container.querySelector('img[src="https://fotos.test/cargo.jpg"]')).not.toBeNull();
  });

  it('sin foto muestra sólo la patente y el modelo', () => {
    const { container, getByText } = render(<OrderPartiesCard order={order(null)} />);
    expect(container.querySelector('img')).toBeNull();
    expect(getByText('AB123CD')).toBeInTheDocument();
  });
});

describe('OrderPartiesCard: cómo se asignó', () => {
  it('dice el método de asignación del chofer', () => {
    const { getByText } = render(<OrderPartiesCard order={order(null, 'route_sheet')} />);
    expect(getByText('Asignado: hoja de ruta')).toBeInTheDocument();
  });

  it('un pedido anterior al dato no muestra nada', () => {
    const { queryByText } = render(<OrderPartiesCard order={order(null, null)} />);
    expect(queryByText(/Asignado:/)).toBeNull();
  });
});
