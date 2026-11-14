import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { failed, mutation, ok, renderPage } from '../../test/pageTest';
import { companyItem } from '../../test/platformFixtures';

const state = vi.hoisted(() => ({ tasks: undefined as unknown, update: undefined as unknown, tasksFor: vi.fn() }));
vi.mock('../../services/queries/platformConsole', () => ({
  useAllPlatformCompanies: () => ({
    companies: [companyItem({ id: 'c1', name: 'Nahuel Gas' })],
    total: 2,
    loading: false,
    error: null,
  }),
  useCompanyScheduledTasks: (id: unknown) => {
    state.tasksFor(id);
    return state.tasks;
  },
  useUpdateCompanyScheduledTasks: () => state.update,
}));
vi.mock('../../services/queries/users', () => ({ useUser: () => ({ data: undefined, isPending: false }) }));
vi.mock('../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { PlatformScheduledTasks } from './PlatformScheduledTasks';

const config = {
  dispatchRetrySeconds: 15,
  reservationActivationSeconds: 300,
  unpaidReservationExpirySeconds: 3600,
  unpaidMercadoPagoExpirySeconds: 1800,
  fleetAlertHour: 8,
  isDefault: true,
  updatedAt: null,
  updatedByUserId: null,
};

const render = (url = '/platform/scheduled-tasks?company=c1') => renderPage(<PlatformScheduledTasks />, { url });
const update = () => state.update as ReturnType<typeof mutation>;
const save = () => screen.getByRole('button', { name: 'Guardar cambios' });

beforeEach(() => {
  state.tasks = ok(config);
  state.update = mutation();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Tareas programadas (plataforma)', () => {
  it('sin empresa elegida pide elegir una y no consulta', () => {
    render('/platform/scheduled-tasks');
    expect(screen.getByText('Elegí una empresa', { selector: 'h3, h2, p, span, div' })).toBeInTheDocument();
    expect(state.tasksFor).not.toHaveBeenCalled();
  });

  it('elegir una empresa carga sus frecuencias', () => {
    render('/platform/scheduled-tasks');
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'c1' } });
    expect(state.tasksFor).toHaveBeenLastCalledWith('c1');
    expect(screen.getAllByLabelText('Cada')).toHaveLength(4);
  });

  it('la hora del aviso de flota se ve pero no se edita', () => {
    render();
    expect(screen.getByText('08:00 (hora de Argentina)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Hora (0 a 23)')).not.toBeInTheDocument();
  });

  it('valida el tic antes de mandar', async () => {
    render();
    fireEvent.change(screen.getAllByLabelText('Cada')[1], { target: { value: '7' } });
    expect(await screen.findByText('Tiene que ser múltiplo de 5 minutos')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('guardar manda las cuatro frecuencias en segundos y nunca la hora', async () => {
    render();
    fireEvent.change(screen.getAllByLabelText('Cada')[0], { target: { value: '30' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update().mutate).toHaveBeenCalled());
    expect(update().mutate.mock.calls[0]?.[0]).toEqual({
      id: 'c1',
      body: {
        dispatchRetrySeconds: 30,
        reservationActivationSeconds: 300,
        unpaidReservationExpirySeconds: 3600,
        unpaidMercadoPagoExpirySeconds: 1800,
      },
    });
  });

  it('un 400 de la API se muestra con su mensaje', async () => {
    render();
    fireEvent.change(screen.getAllByLabelText('Cada')[0], { target: { value: '30' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update().mutate).toHaveBeenCalled());
    const options = update().mutate.mock.calls[0]?.[1] as { onError: (e: unknown) => void };
    act(() => options.onError(new ApiError(400, ['dispatchRetrySeconds debe ser múltiplo de 15'])));
    expect(await screen.findByRole('alert')).toHaveTextContent('dispatchRetrySeconds debe ser múltiplo de 15');
  });

  it('un error al cargar se dice y permite reintentar', () => {
    const refetch = vi.fn();
    state.tasks = failed(refetch);
    render();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
