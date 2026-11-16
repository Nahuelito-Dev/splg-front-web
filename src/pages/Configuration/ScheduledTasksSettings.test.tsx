import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { failed, mutation, ok } from '../../test/pageTest';
import { ScheduledTasksSettings } from './ScheduledTasksSettings';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  query: undefined as unknown,
  update: undefined as unknown,
}));
const queryOptions = vi.hoisted(() => vi.fn());
vi.mock('../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../services/queries/moduleConfig', () => ({
  useScheduledTasksConfig: (options: unknown) => {
    queryOptions(options);
    return state.query;
  },
  useUpdateScheduledTasksConfig: () => state.update,
}));
vi.mock('../../services/queries/users', () => ({ useUser: () => ({ data: undefined, isPending: false }) }));
vi.mock('../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: { name: 'OrixTech' } }) }));
vi.mock('../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const config = (over: Record<string, unknown> = {}) => ({
  dispatchRetrySeconds: 15,
  reservationActivationSeconds: 300,
  unpaidReservationExpirySeconds: 3600,
  unpaidMercadoPagoExpirySeconds: 1800,
  fleetAlertHour: 8,
  isDefault: false,
  updatedAt: '2026-10-15T12:00:00.000Z',
  updatedByUserId: null,
  ...over,
});

const tree = () => (
  <MemoryRouter>
    <ScheduledTasksSettings />
  </MemoryRouter>
);
let view: ReturnType<typeof render>;

const setup = (data = config()) => {
  state.query = ok(data);
  state.update = mutation();
  view = render(tree());
  return state.update as ReturnType<typeof mutation>;
};

/** Llega otra versión de la configuración desde la API. */
const arrives = (data: ReturnType<typeof config>) => {
  state.query = ok(data);
  view.rerender(tree());
};

afterEach(() => {
  cleanup();
  queryOptions.mockReset();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
});

const save = () => screen.getByRole('button', { name: 'Guardar cambios' });
const hour = () => screen.getByLabelText('Hora (0 a 23)');

describe('ScheduledTasksSettings', () => {
  it('muestra las cuatro frecuencias como sólo lectura: las fija la plataforma', () => {
    setup();
    expect(screen.getByText(/Las fija OrixTech/)).toBeInTheDocument();
    expect(screen.getByText('cada 15 segundos')).toBeInTheDocument();
    expect(screen.getByText('cada 5 minutos')).toBeInTheDocument();
    expect(screen.getByText('cada 1 hora')).toBeInTheDocument();
    expect(screen.getByText('cada 30 minutos')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cada')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Unidad')).not.toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
    expect(hour()).toHaveValue(8);
  });

  it('guardar manda sólo la hora del aviso de flota', async () => {
    const update = setup();
    fireEvent.change(hour(), { target: { value: '9' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toEqual({ fleetAlertHour: 9 });
  });

  it('la hora del aviso va de 0 a 23 y la ayuda dice hora de Argentina', async () => {
    setup();
    expect(screen.getByText(/hora de Argentina/)).toBeInTheDocument();
    fireEvent.change(hour(), { target: { value: '24' } });
    expect(await screen.findByText('Ingresá una hora entre 0 y 23')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('ya no ofrece restablecer las frecuencias', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Restablecer valores por defecto' })).not.toBeInTheDocument();
  });

  it('sin permiso de escritura la hora queda deshabilitada', () => {
    state.perms = { needsDistributor: false, canWrite: false, writeHint: 'Sólo lectura' };
    setup();
    expect(hour()).toBeDisabled();
    expect(save()).toBeDisabled();
  });

  it('el administrador general sin «Ver como» ve el aviso y no consulta', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: 'Elegí' };
    state.query = ok(undefined);
    state.update = mutation();
    render(<ScheduledTasksSettings />);
    expect(screen.getByText(/Elegí una distribuidora con «Ver como»/)).toBeInTheDocument();
    expect(queryOptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('si la consulta falla muestra el error', () => {
    state.query = failed();
    state.update = mutation();
    render(<ScheduledTasksSettings />);
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
  });

  it('muestra el mensaje del back cuando el guardado falla', async () => {
    const update = setup();
    fireEvent.change(hour(), { target: { value: '9' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const options = update.mutate.mock.calls[0]?.[1] as { onError: (e: unknown) => void };
    act(() => options.onError(new ApiError(400, ['fleetAlertHour: fuera de rango'])));
    expect(await screen.findByText('fleetAlertHour: fuera de rango')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('fleetAlertHour: fuera de rango');
  });

  it('con valores por defecto y sin cambios no deja guardar', async () => {
    setup(config({ isDefault: true, updatedAt: null }));
    await new Promise((r) => setTimeout(r, 20));
    expect(save()).toBeDisabled();
  });

  it('si llega otra versión con cambios sin guardar, avisa y recarga recién al aceptar', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Hora (0 a 23)'), { target: { value: '20' } });
    await waitFor(() => expect(save()).toBeEnabled());
    arrives(config({ fleetAlertHour: 11, updatedAt: '2026-10-15T13:00:00.000Z' }));
    expect(await screen.findByText(/Otro administrador cambió la configuración/)).toBeInTheDocument();
    expect(screen.getByLabelText('Hora (0 a 23)')).toHaveValue(20);
    fireEvent.click(screen.getByRole('button', { name: 'Ver los cambios' }));
    await waitFor(() => expect(screen.getByLabelText('Hora (0 a 23)')).toHaveValue(11));
  });

  it('si llega otra versión sin cambios sin guardar, se carga sola', async () => {
    setup();
    arrives(config({ fleetAlertHour: 11, updatedAt: '2026-10-15T13:00:00.000Z' }));
    await waitFor(() => expect(screen.getByLabelText('Hora (0 a 23)')).toHaveValue(11));
    expect(screen.queryByText(/Otro administrador/)).not.toBeInTheDocument();
  });
});
