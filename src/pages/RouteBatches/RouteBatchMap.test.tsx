import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RouteBatchMap } from './RouteBatchMap';

afterEach(cleanup);

describe('RouteBatchMap', () => {
  it('numera cada parada en su lugar y las une en línea punteada', () => {
    render(
      <RouteBatchMap
        label="Recorrido del lote"
        points={[
          { position: [-27.37, -55.89], sequence: 1 },
          { position: [-27.38, -55.9], sequence: 2 },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Recorrido del lote' })).toContainElement(
      screen.getByTestId('google-map'),
    );
    expect(screen.getByRole('img', { name: 'Parada 2' })).toHaveAttribute('data-lat', '-27.38');
    expect(screen.getByRole('img', { name: 'Parada 1' })).toHaveTextContent('1');
    expect(screen.getByTestId('map-polyline')).toHaveAttribute('data-dashed', 'true');
    expect(screen.getByTestId('map-polyline')).toHaveAttribute('data-points', '2');
  });

  it('con una sola parada no hay línea', () => {
    render(<RouteBatchMap label="Recorrido" points={[{ position: [-27.37, -55.89], sequence: 1 }]} />);
    expect(screen.queryByTestId('map-polyline')).not.toBeInTheDocument();
  });
});
