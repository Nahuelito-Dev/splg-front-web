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
const confirmed = vi.hoisted(() => ({ value: true }));
vi.mock('../../utils/notifications', () => ({
  confirm: () => Promise.resolve(confirmed.value),
  notify: { success: vi.fn(), error: vi.fn() },
}));

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
  confirmed.value = true;
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
});

const save = () => screen.getByRole('button', { name: 'Guardar cambios' });
const amounts = () => screen.getAllByLabelText('Cada');

describe('ScheduledTasksSettings', () => {
  it('muestra cada intervalo en su unidad legible', () => {
    setup();
    expect(amounts().map((input) => (input as HTMLInputElement).value)).toEqual(['15', '5', '1', '30']);
    const units = screen.getAllByLabelText('Unidad').map((select) => (select as HTMLSelectElement).value);
    expect(units).toEqual(['seconds', 'minutes', 'hours', 'minutes']);
    expect(screen.getByLabelText('Hora (0 a 23)')).toHaveValue(8);
  });

  it('un intervalo que no es múltiplo del tic muestra el motivo y bloquea guardar', async () => {
    setup();
    fireEvent.change(amounts()[1], { target: { value: '7' } });
    expect(await screen.findByText('Tiene que ser múltiplo de 5 minutos')).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('los reintentos del despacho no pueden pasar de 5 minutos', async () => {
    setup();
    fireEvent.change(screen.getAllByLabelText('Unidad')[0], { target: { value: 'minutes' } });
    fireEvent.change(amounts()[0], { target: { value: '6' } });
    expect(await screen.findByText('No puede superar 5 minutos')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('cambiar la unidad convierte a segundos al guardar y manda todos los campos', async () => {
    const update = setup();
    fireEvent.change(amounts()[1], { target: { value: '1' } });
    fireEvent.change(screen.getAllByLabelText('Unidad')[1], { target: { value: 'hours' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toEqual({
      dispatchRetrySeconds: 15,
      reservationActivationSeconds: 3600,
      unpaidReservationExpirySeconds: 3600,
      unpaidMercadoPagoExpirySeconds: 1800,
      fleetAlertHour: 8,
    });
  });

  it('la hora del aviso va de 0 a 23 y la ayuda dice hora de Argentina', async () => {
    setup();
    expect(screen.getByText(/hora de Argentina/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hora (0 a 23)'), { target: { value: '24' } });
    expect(await screen.findByText('Ingresá una hora entre 0 y 23')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('restablecer pide confirmación y manda un PUT sin campos', async () => {
    const update = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer valores por defecto' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toEqual({});
  });

  it('si no se confirma el restablecimiento, no manda nada', async () => {
    confirmed.value = false;
    const update = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer valores por defecto' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(update.mutate).not.toHaveBeenCalled();
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
    fireEvent.change(screen.getByLabelText('Hora (0 a 23)'), { target: { value: '9' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const options = update.mutate.mock.calls[0]?.[1] as { onError: (e: unknown) => void };
    act(() => options.onError(new ApiError(400, ['fleetAlertHour: fuera de rango'])));
    expect(await screen.findByText('fleetAlertHour: fuera de rango')).toBeInTheDocument();
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
