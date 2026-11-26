import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { failed, mutation, ok } from '../../test/pageTest';
import { DispatchSettings } from './DispatchSettings';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  query: undefined as unknown,
  update: undefined as unknown,
}));
const queryOptions = vi.hoisted(() => vi.fn());
vi.mock('../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../services/queries/moduleConfig', () => ({
  useDispatchConfig: (options: unknown) => {
    queryOptions(options);
    return state.query;
  },
  useUpdateDispatchConfig: () => state.update,
}));
vi.mock('./components/DispatchMetricsSection', () => ({ DispatchMetricsSection: () => null }));
vi.mock('../../services/queries/users', () => ({
  useUser: () => ({ data: { full_name: 'Ana Admin' }, isPending: false }),
}));
const confirmed = vi.hoisted(() => ({ value: true }));
vi.mock('../../utils/notifications', () => ({
  confirm: () => Promise.resolve(confirmed.value),
  notify: { success: vi.fn(), error: vi.fn() },
}));

const config = (over: Record<string, unknown> = {}) => ({
  radiusStepsKm: [5, 10, 15, 20],
  offerTtlSeconds: 30,
  finishingRadiusMeters: 300,
  noDriverExpiryMinutes: 90,
  arrivalRadiusMeters: 200,
  osrmCandidateCount: 6,
  isDefault: false,
  updatedAt: '2026-10-15T12:00:00.000Z',
  updatedByUserId: 'user-1',
  ...over,
});

const tree = () => (
  <MemoryRouter>
    <DispatchSettings />
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
const expiryInput = () => screen.getByLabelText('Vencimiento de pedidos sin chofer (minutos)');
const osrmInput = () => screen.getByLabelText('Choferes a medir por calle');
const arrivalInput = () => screen.getByLabelText('Radio para marcar «Llegué» (metros)');

describe('DispatchSettings', () => {
  it('muestra los pasos, la ventana y quién modificó', () => {
    setup();
    expect(screen.getByLabelText('Paso 1 (km)')).toHaveValue(5);
    expect(screen.getByLabelText('Paso 4 (km)')).toHaveValue(20);
    expect(screen.getByLabelText('Segundos')).toHaveValue(30);
    expect(screen.getByLabelText('Metros al destino')).toHaveValue(300);
    expect(expiryInput()).toHaveValue(90);
    expect(arrivalInput()).toHaveValue(200);
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
    expect(screen.queryByText('Valores por defecto')).not.toBeInTheDocument();
  });

  it('con isDefault lo indica y no deja guardar sin cambios, para no fijar los defaults sin querer', async () => {
    setup(config({ isDefault: true, updatedAt: null, updatedByUserId: null }));
    expect(screen.getByText('Valores por defecto')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(save()).toBeDisabled();
  });

  it('sin cambios no deja guardar', () => {
    setup();
    expect(save()).toBeDisabled();
  });

  it('un paso que no supera al anterior muestra el error y bloquea guardar', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Paso 2 (km)'), { target: { value: '4' } });
    expect(await screen.findByText(/mayor que el paso anterior \(5 km\)/)).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('cambiar el paso 1 muestra y después limpia el error del paso 2, y Guardar sigue al error', async () => {
    setup(config({ radiusStepsKm: [5, 10] }));
    fireEvent.change(screen.getByLabelText('Paso 1 (km)'), { target: { value: '12' } });
    expect(await screen.findByText(/mayor que el paso anterior \(12 km\)/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Paso 1 (km)'), { target: { value: '5' } });
    await waitFor(() => expect(screen.queryByText(/mayor que el paso anterior/)).not.toBeInTheDocument());
    // De vuelta al valor original no hay nada que guardar, pero tampoco un error a la vista.
    expect(save()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Paso 1 (km)'), { target: { value: '6' } });
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it('el paso nuevo va vacío si el último está vacío o vale 100', () => {
    setup(config({ radiusStepsKm: [5, 100] }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar paso' }));
    expect(screen.getByLabelText('Paso 3 (km)')).toHaveValue(null);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar paso' }));
    expect(screen.getByLabelText('Paso 4 (km)')).toHaveValue(null);
  });

  it('si llega otra versión sin cambios sin guardar, se carga sola', async () => {
    setup();
    arrives(config({ radiusStepsKm: [7, 14], updatedAt: '2026-10-15T13:00:00.000Z' }));
    await waitFor(() => expect(screen.getByLabelText('Paso 1 (km)')).toHaveValue(7));
    expect(screen.queryByText(/Otro administrador/)).not.toBeInTheDocument();
  });

  it('si llega otra versión con cambios sin guardar, avisa y recarga recién al aceptar', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Segundos'), { target: { value: '99' } });
    await waitFor(() => expect(save()).toBeEnabled());
    arrives(config({ offerTtlSeconds: 60, updatedAt: '2026-10-15T13:00:00.000Z' }));
    expect(await screen.findByText(/Otro administrador cambió la configuración/)).toBeInTheDocument();
    expect(screen.getByLabelText('Segundos')).toHaveValue(99);
    fireEvent.click(screen.getByRole('button', { name: 'Ver los cambios' }));
    await waitFor(() => expect(screen.getByLabelText('Segundos')).toHaveValue(60));
    expect(screen.queryByText(/Otro administrador/)).not.toBeInTheDocument();
  });

  it('lo que guarda la propia persona no se toma por un cambio ajeno', async () => {
    const update = setup();
    fireEvent.change(screen.getByLabelText('Segundos'), { target: { value: '45' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const saved = config({ offerTtlSeconds: 45, updatedAt: '2026-10-15T13:00:00.000Z' });
    const options = update.mutate.mock.calls[0]?.[1] as { onSuccess: (saved: unknown) => void };
    act(() => options.onSuccess(saved));
    arrives(saved);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/Otro administrador/)).not.toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('una ventana fuera de rango bloquea guardar', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Segundos'), { target: { value: '5' } });
    expect(await screen.findByText(/entre 10 y 300 segundos/)).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('el radio de por terminar fuera de rango bloquea guardar; 0 es válido (apagado)', async () => {
    const update = setup();
    fireEvent.change(screen.getByLabelText('Metros al destino'), { target: { value: '6000' } });
    expect(await screen.findByText(/entre 0 y 5000 metros/)).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
    fireEvent.change(screen.getByLabelText('Metros al destino'), { target: { value: '0' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toMatchObject({ finishingRadiusMeters: 0 });
  });

  it('agrega un paso (hasta 8) y lo quita', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar paso' }));
    expect(screen.getByLabelText('Paso 5 (km)')).toHaveValue(25);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el paso 5' }));
    expect(screen.queryByLabelText('Paso 5 (km)')).not.toBeInTheDocument();
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Agregar paso' }));
    expect(screen.getByRole('button', { name: 'Agregar paso' })).toBeDisabled();
  });

  it('guarda el cuerpo completo con números', async () => {
    const update = setup();
    fireEvent.change(screen.getByLabelText('Paso 4 (km)'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Segundos'), { target: { value: '45' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toEqual({
      radiusStepsKm: [5, 10, 15, 25],
      offerTtlSeconds: 45,
      finishingRadiusMeters: 300,
      noDriverExpiryMinutes: 90,
      arrivalRadiusMeters: 200,
      osrmCandidateCount: 6,
    });
  });

  it('al guardar otro parámetro conserva el radio de «Llegué» y el vencimiento ya configurados', async () => {
    // El PUT reemplaza: un campo que no se manda vuelve a su valor por omisión.
    const update = setup(config({ arrivalRadiusMeters: 300, noDriverExpiryMinutes: 45 }));
    fireEvent.change(screen.getByLabelText('Segundos'), { target: { value: '60' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toMatchObject({
      offerTtlSeconds: 60,
      arrivalRadiusMeters: 300,
      noDriverExpiryMinutes: 45,
    });
  });

  it('el vencimiento sin chofer fuera de 1..1440 bloquea guardar', async () => {
    setup();
    fireEvent.change(expiryInput(), { target: { value: '0' } });
    expect(await screen.findByText(/entre 1 y 1440 minutos/)).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
    fireEvent.change(expiryInput(), { target: { value: '1441' } });
    expect(await screen.findByText(/entre 1 y 1440 minutos/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('el radio de «Llegué» fuera de rango bloquea guardar; 0 es válido (sin control)', async () => {
    const update = setup();
    fireEvent.change(arrivalInput(), { target: { value: '5001' } });
    expect(await screen.findByText(/entre 0 y 5000 metros/)).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
    fireEvent.change(arrivalInput(), { target: { value: '0' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toMatchObject({ arrivalRadiusMeters: 0, noDriverExpiryMinutes: 90 });
  });

  it('los choferes a medir por calle: fuera de 1..20 bloquea guardar y el valor válido viaja en el PUT', async () => {
    const update = setup();
    expect(osrmInput()).toHaveValue(6);
    fireEvent.change(osrmInput(), { target: { value: '21' } });
    expect(await screen.findByText(/entre 1 y 20 choferes/)).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
    fireEvent.change(osrmInput(), { target: { value: '0' } });
    expect(await screen.findByText(/entre 1 y 20 choferes/)).toBeInTheDocument();
    fireEvent.change(osrmInput(), { target: { value: '12' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toMatchObject({ osrmCandidateCount: 12 });
  });

  it('muestra el mensaje del back cuando el guardado falla', async () => {
    const update = setup();
    fireEvent.change(screen.getByLabelText('Segundos'), { target: { value: '45' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const options = update.mutate.mock.calls[0]?.[1] as { onError: (e: unknown) => void };
    act(() => options.onError(new ApiError(400, ['offerTtlSeconds: demasiado'])));
    expect(await screen.findByText('offerTtlSeconds: demasiado')).toBeInTheDocument();
  });

  it('restablecer pide confirmación y manda un PUT sin campos', async () => {
    const update = setup(config({ radiusStepsKm: [2, 4], offerTtlSeconds: 90 }));
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer valores por defecto' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0]?.[0]).toEqual({});
  });

  it('si no se confirma el restablecimiento, no manda nada', async () => {
    confirmed.value = false;
    const update = setup(config({ offerTtlSeconds: 90 }));
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer valores por defecto' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(update.mutate).not.toHaveBeenCalled();
  });

  it('con valores por defecto no hay nada que restablecer', () => {
    setup(config({ isDefault: true, updatedAt: null, updatedByUserId: null }));
    expect(screen.getByRole('button', { name: 'Restablecer valores por defecto' })).toBeDisabled();
  });

  it('el administrador general sin «Ver como» ve el aviso y no consulta', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: 'Elegí' };
    state.query = ok(undefined);
    state.update = mutation();
    render(<DispatchSettings />);
    expect(screen.getByText(/Elegí una distribuidora con «Ver como»/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Segundos')).not.toBeInTheDocument();
    expect(queryOptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('si la consulta falla muestra el error', () => {
    state.query = failed();
    state.update = mutation();
    render(<DispatchSettings />);
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
  });
});
