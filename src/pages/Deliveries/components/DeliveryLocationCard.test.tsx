import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Delivery } from '../../../services/api/types';

import { DeliveryLocationCard } from './DeliveryLocationCard';

afterEach(cleanup);

const delivery = (changes: Partial<Delivery>) => ({ latLng: null, actual_location: null, ...changes }) as Delivery;

describe('DeliveryLocationCard', () => {
  it('dibuja el mapa en la última posición y muestra la dirección aproximada', () => {
    render(
      <DeliveryLocationCard delivery={delivery({ latLng: '-27.37,-55.89', actual_location: 'Av. Mitre 1234' })} />,
    );
    expect(screen.getByTestId('google-map')).toHaveAttribute('data-center', '-27.37,-55.89');
    expect(screen.getByRole('img', { name: 'Última ubicación del chofer' })).toHaveAttribute('data-lat', '-27.37');
    expect(screen.getByText('Av. Mitre 1234')).toBeInTheDocument();
    expect(screen.getByText(/la API no informa a qué hora/)).toBeInTheDocument();
  });

  it('sin posición no hay mapa y lo avisa', () => {
    render(<DeliveryLocationCard delivery={delivery({})} />);
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
    expect(screen.getByText('Todavía no se registró una posición.')).toBeInTheDocument();
  });
});
