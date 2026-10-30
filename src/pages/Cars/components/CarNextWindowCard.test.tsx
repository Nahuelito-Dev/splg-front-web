import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ forecast: vi.fn(), needsDistributor: false }));
vi.mock('../../../hooks', () => ({ usePermissions: () => ({ needsDistributor: state.needsDistributor }) }));
vi.mock('../../../services/queries/planner', () => ({
  usePlannerForecast: (...args: unknown[]) => state.forecast(...args) as unknown,
}));

import { CarNextWindowCard } from './CarNextWindowCard';

const draw = () =>
  render(
    <MemoryRouter>
      <CarNextWindowCard carId="car-1" />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
});

describe('CarNextWindowCard', () => {
  it('muestra la próxima ventana de taller y su estado', () => {
    state.forecast.mockReturnValue(
      ok({
        vehicles: [
          {
            carId: 'car-1',
            nextWindow: {
              start: '2026-11-02T11:00:00.000Z',
              end: '2026-11-02T16:00:00.000Z',
              status: 'awaiting_confirmation',
            },
          },
        ],
      }),
    );
    draw();
    expect(screen.getByText('lun, 2 nov, 08:00 a 13:00')).toBeInTheDocument();
    expect(screen.getByText('A confirmar')).toBeInTheDocument();
    expect(state.forecast).toHaveBeenCalledWith('car-1', { enabled: true });
  });

  it('sin ventana lo dice', () => {
    state.forecast.mockReturnValue(ok({ vehicles: [{ carId: 'car-1', nextWindow: null }] }));
    draw();
    expect(screen.getByText('Sin ventana de taller')).toBeInTheDocument();
  });

  it('mientras carga y si falla', () => {
    state.forecast.mockReturnValue(loading());
    draw();
    expect(screen.getByText('Buscando la ventana…')).toBeInTheDocument();
    cleanup();
    state.forecast.mockReturnValue(failed());
    draw();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo consultar el planificador');
  });

  it('sin distribuidora elegida no consulta', () => {
    state.needsDistributor = true;
    state.forecast.mockReturnValue(ok(undefined, { data: undefined }));
    draw();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(state.forecast).toHaveBeenCalledWith('car-1', { enabled: false });
  });
});
