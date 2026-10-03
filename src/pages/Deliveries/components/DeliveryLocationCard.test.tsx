import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery } from '../../../services/api/types';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ center, children }: { center: [number, number]; children: React.ReactNode }) => (
    <div data-testid="mapa" data-center={center.join(',')}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: () => null,
}));
vi.mock('../../Tracking/leafletIconFix', () => ({}));

import { DeliveryLocationCard } from './DeliveryLocationCard';

afterEach(cleanup);

const delivery = (changes: Partial<Delivery>) => ({ latLng: null, actual_location: null, ...changes }) as Delivery;

describe('DeliveryLocationCard', () => {
  it('dibuja el mapa en la última posición y muestra la dirección aproximada', () => {
    render(
      <DeliveryLocationCard delivery={delivery({ latLng: '-27.37,-55.89', actual_location: 'Av. Mitre 1234' })} />,
    );
    expect(screen.getByTestId('mapa')).toHaveAttribute('data-center', '-27.37,-55.89');
    expect(screen.getByText('Av. Mitre 1234')).toBeInTheDocument();
    expect(screen.getByText(/la API no informa a qué hora/)).toBeInTheDocument();
  });

  it('sin posición no hay mapa y lo avisa', () => {
    render(<DeliveryLocationCard delivery={delivery({})} />);
    expect(screen.queryByTestId('mapa')).not.toBeInTheDocument();
    expect(screen.getByText('Todavía no se registró una posición.')).toBeInTheDocument();
  });
});
