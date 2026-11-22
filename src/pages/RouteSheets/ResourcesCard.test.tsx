import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RoutePlanResources } from '../../services/api/types';
import { ResourcesCard } from './ResourcesCard';

afterEach(cleanup);

const resources = (photoUrl: string | null) =>
  ({
    drivers: [],
    cars: [
      {
        carId: 'car-1',
        patent: 'AB123CD',
        description: 'Camioneta',
        capacityKg: 950,
        capacityUnits: null,
        photoUrl,
        available: true,
        busySheetId: null,
      },
    ],
  }) as unknown as RoutePlanResources;

describe('ResourcesCard: foto del vehículo', () => {
  it('muestra la foto de cada vehículo de los recursos', () => {
    const { container } = render(<ResourcesCard resources={resources('https://fotos.test/cargo.jpg')} sheets={[]} />);
    expect(container.querySelector('img[src="https://fotos.test/cargo.jpg"]')).not.toBeNull();
  });

  it('sin foto queda la patente sola', () => {
    const { container, getByText } = render(<ResourcesCard resources={resources(null)} sheets={[]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(getByText('AB123CD')).toBeInTheDocument();
  });
});
