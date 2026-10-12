import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../../../../services/queries/orders', () => ({ useOrderIncidents: () => state.value }));

import { OrderIncidents } from './OrderIncidents';

afterEach(cleanup);

describe('OrderIncidents', () => {
  it('si falla la carga lo dice en vez de ocultar la tarjeta', () => {
    state.value = { data: undefined, isError: true, error: new Error('boom'), refetch: vi.fn() };
    render(<OrderIncidents orderId="o-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las incidencias del pedido');
  });

  it('sin incidencias no dibuja nada', () => {
    state.value = { data: [], isError: false };
    const { container } = render(<OrderIncidents orderId="o-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
