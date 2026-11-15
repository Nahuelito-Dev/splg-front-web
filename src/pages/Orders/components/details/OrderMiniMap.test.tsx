import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OrderMiniMap } from './OrderMiniMap';

afterEach(cleanup);

describe('OrderMiniMap', () => {
  it('centra el mapa en el punto de entrega y lo marca, sin zoom con la rueda suelta', () => {
    render(<OrderMiniMap position={[-27.37, -55.89]} label="Mapa del punto de entrega: Mitre 123" />);
    const map = screen.getByTestId('google-map');
    expect(screen.getByRole('group', { name: 'Mapa del punto de entrega: Mitre 123' })).toContainElement(map);
    expect(map).toHaveAttribute('data-center', '-27.37,-55.89');
    expect(map).toHaveAttribute('data-gestures', 'cooperative');
    expect(screen.getByRole('img', { name: 'Punto de entrega' })).toHaveAttribute('data-lng', '-55.89');
  });
});
