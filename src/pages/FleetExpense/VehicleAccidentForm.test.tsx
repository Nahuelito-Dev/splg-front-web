import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderRoutes } from '../../test/renderRoutes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok } from '../../test/pageTest';
import type { VehicleAccident } from '../../services/api/types';

const permissions = vi.hoisted(() => ({ canWrite: true }));
const queries = vi.hoisted(() => ({ accident: vi.fn(), create: vi.fn(), update: vi.fn() }));
const notifySuccess = vi.hoisted(() => vi.fn());

vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: vi.fn(), info: vi.fn() },
  confirm: vi.fn(),
  dismissConfirm: vi.fn(),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canWrite: permissions.canWrite,
    writeHint: permissions.canWrite ? undefined : 'Elegí una distribuidora con «Ver como» para crear',
  }),
}));
const carsRefetch = vi.hoisted(() => vi.fn());
const DEFAULT_CARS = vi.hoisted(() => ({
  data: [{ car_id: 'c-1', car_patent: 'AB123CD', car_brand: 'Fiat', car_model: 'Fiorino' }],
  isPending: false,
  error: null,
  refetch: () => undefined,
}));
const carsQuery = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock('../../services/queries/cars', () => ({ useCars: () => carsQuery.current }));
vi.mock('../../services/queries/fleetExpense', () => ({
  useVehicleAccident: (...args: unknown[]) => queries.accident(...args) as unknown,
  useCreateVehicleAccident: () => queries.create() as unknown,
  useUpdateVehicleAccident: () => queries.update() as unknown,
}));

import { VehicleAccidentForm } from './VehicleAccidentForm';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  permissions.canWrite = true;
  carsQuery.current = DEFAULT_CARS;
});

beforeEach(() => {
  carsQuery.current = DEFAULT_CARS;
});

const ACCIDENT = {
  accidentId: 'a-1',
  carId: 'c-1',
  carPatent: 'AB123CD',
  occurredAt: '2026-10-10T12:00:00.000Z',
  location: null,
  address: null,
  description: 'Choque trasero',
  injuries: false,
  thirdPartiesInvolved: false,
  hazmatRelease: false,
  policeReportNumber: null,
  insurerClaimNumber: null,
  vehicleUnusable: false,
  status: 'reported',
} as unknown as VehicleAccident;

const renderAt = (url: string) =>
  renderRoutes(
    <>
      <Route path="/fleet/accidents/new" element={<VehicleAccidentForm />} />
      <Route path="/fleet/accidents/:id/edit" element={<VehicleAccidentForm />} />
      <Route path="/fleet/accidents" element={<p>lista de siniestros</p>} />
    </>,
    [url],
  );

const setup = () => {
  queries.accident.mockReturnValue(ok(undefined));
  const succeed = (_vars: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.();
  const create = mutation({ mutate: vi.fn(succeed) });
  const update = mutation({ mutate: vi.fn(succeed) });
  queries.create.mockReturnValue(create);
  queries.update.mockReturnValue(update);
  return { create, update };
};

describe('VehicleAccidentForm', () => {
  it('el alta es una página en secciones', () => {
    setup();
    renderAt('/fleet/accidents/new');
    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo siniestro' })).toBeInTheDocument();
    for (const section of ['Qué pasó', 'Lugar', 'Gravedad', 'Trámites']) {
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeInTheDocument();
    }
  });

  it('enviar vacío muestra los errores, enfoca el primero y no llama a la API', async () => {
    const { create } = setup();
    renderAt('/fleet/accidents/new');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar siniestro' }));
    expect(await screen.findByText('Elegí el vehículo')).toBeInTheDocument();
    expect(screen.getByText('Contá qué pasó')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText(/^Vehículo/)).toHaveFocus());
  });

  it('un siniestro con fecha futura se rechaza antes de enviar (el back responde 400)', async () => {
    const { create } = setup();
    renderAt('/fleet/accidents/new');
    fireEvent.change(screen.getByLabelText(/^Vehículo/), { target: { value: 'c-1' } });
    fireEvent.change(screen.getByLabelText(/^Cuándo ocurrió/), { target: { value: '2999-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/^Qué pasó/), { target: { value: 'Choque' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar siniestro' }));
    expect(await screen.findByText('El siniestro no puede ser futuro')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('manda el mismo cuerpo que el modal y vuelve a la lista', async () => {
    const { create } = setup();
    renderAt('/fleet/accidents/new');
    fireEvent.change(screen.getByLabelText(/^Vehículo/), { target: { value: 'c-1' } });
    fireEvent.change(screen.getByLabelText(/^Qué pasó/), { target: { value: 'Choque trasero' } });
    // 12:00 hora argentina (UTC-3) viaja como 15:00 UTC
    fireEvent.change(screen.getByLabelText(/^Cuándo ocurrió/), { target: { value: '2026-10-10T12:00' } });
    fireEvent.click(screen.getByLabelText('El vehículo quedó inutilizable'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar siniestro' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toEqual({
      carId: 'c-1',
      occurredAt: '2026-10-10T15:00:00.000Z',
      location: null,
      address: null,
      description: 'Choque trasero',
      injuries: false,
      thirdPartiesInvolved: false,
      hazmatRelease: false,
      policeReportNumber: null,
      insurerClaimNumber: null,
      vehicleUnusable: true,
    });
    expect(await screen.findByText('lista de siniestros')).toBeInTheDocument();
    expect(notifySuccess).toHaveBeenCalledWith('Siniestro registrado');
  });

  it('la edición avanza el estado de a un paso y no manda el vehículo ni «inutilizable»', async () => {
    const { update } = setup();
    queries.accident.mockReturnValue(ok(ACCIDENT));
    renderAt('/fleet/accidents/a-1/edit');
    expect(screen.getByRole('heading', { level: 1, name: 'Editar siniestro' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Vehículo/)).toBeDisabled();
    expect(screen.queryByLabelText('El vehículo quedó inutilizable')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Estado/), { target: { value: 'under_review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const call = update.mutate.mock.calls[0][0] as { id: string; body: Record<string, unknown> };
    expect(call.id).toBe('a-1');
    expect(call.body).toMatchObject({ description: 'Choque trasero', status: 'under_review' });
    expect(call.body).not.toHaveProperty('carId');
    expect(call.body).not.toHaveProperty('vehicleUnusable');
    expect(await screen.findByText('lista de siniestros')).toBeInTheDocument();
  });

  it('al pasar de la edición de un siniestro a la de otro, el formulario se arma con el segundo y guarda su id', async () => {
    const { update } = setup();
    const other = { ...ACCIDENT, accidentId: 'a-2', description: 'Roce lateral' } as VehicleAccident;
    queries.accident.mockImplementation((id: string) => ok(id === 'a-1' ? ACCIDENT : other));
    const { router } = renderAt('/fleet/accidents/a-1/edit');
    expect(screen.getByLabelText(/^Qué pasó/)).toHaveValue('Choque trasero');
    await act(() => router.navigate('/fleet/accidents/a-2/edit'));
    await waitFor(() => expect(screen.getByLabelText(/^Qué pasó/)).toHaveValue('Roce lateral'));
    fireEvent.change(screen.getByLabelText(/^Dirección/), { target: { value: 'Ruta 12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toMatchObject({ id: 'a-2', body: { description: 'Roce lateral' } });
  });

  it('si fallan los vehículos lo dice con «Reintentar» y no dibuja el formulario', () => {
    setup();
    carsQuery.current = { ...failed(carsRefetch), isPending: false };
    renderAt('/fleet/accidents/new');
    expect(screen.queryByLabelText(/^Qué pasó/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(carsRefetch).toHaveBeenCalled();
  });

  it('un error de recarga con datos en caché no desmonta el formulario: avisa en línea y reintenta', () => {
    setup();
    carsQuery.current = { ...DEFAULT_CARS, error: new Error('boom'), refetch: carsRefetch };
    queries.accident.mockReturnValue(ok(ACCIDENT));
    renderAt('/fleet/accidents/a-1/edit');
    expect(screen.getByLabelText(/^Qué pasó/)).toHaveValue('Choque trasero');
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos actualizar los vehículos');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(carsRefetch).toHaveBeenCalled();
  });

  it('en edición el vehículo actual tiene su opción aunque la lista no lo traiga', () => {
    setup();
    carsQuery.current = ok([]);
    queries.accident.mockReturnValue(ok(ACCIDENT));
    renderAt('/fleet/accidents/a-1/edit');
    const select = screen.getByLabelText<HTMLSelectElement>(/^Vehículo/);
    expect(select.value).toBe('c-1');
    expect(select.options[select.selectedIndex].textContent).toBe('AB123CD');
  });

  it('carga y error al traer el siniestro', () => {
    setup();
    queries.accident.mockReturnValue(loading());
    renderAt('/fleet/accidents/a-1/edit');
    expect(screen.getByRole('status')).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    queries.accident.mockReturnValue(failed(refetch));
    renderAt('/fleet/accidents/a-1/edit');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('sin distribuidora elegida no muestra el formulario', () => {
    setup();
    permissions.canWrite = false;
    renderAt('/fleet/accidents/new');
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Qué pasó/)).not.toBeInTheDocument();
  });
});
