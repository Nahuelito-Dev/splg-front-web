import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderRoutes } from '../../test/renderRoutes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok } from '../../test/pageTest';
import type { FuelLoad } from '../../services/api/types';

const permissions = vi.hoisted(() => ({ canWrite: true }));
const queries = vi.hoisted(() => ({ load: vi.fn(), last: vi.fn(), create: vi.fn(), update: vi.fn() }));
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
  data: [
    {
      car_id: 'c-1',
      car_patent: 'AB123CD',
      car_brand: 'Fiat',
      car_model: 'Fiorino',
      tank_capacity_liters: 60,
      odometer_km: 100,
    },
  ],
  isPending: false,
  error: null,
  refetch: () => undefined,
}));
const carsQuery = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock('../../services/queries/cars', () => ({ useCars: () => carsQuery.current }));
vi.mock('../../services/queries/fleetExpense', () => ({
  useFuelLoad: (...args: unknown[]) => queries.load(...args) as unknown,
  useFuelLoads: (...args: unknown[]) => queries.last(...args) as unknown,
  useCreateFuelLoad: () => queries.create() as unknown,
  useUpdateFuelLoad: () => queries.update() as unknown,
}));
vi.mock('../Orders/components/useOrderCashBoxes', () => ({
  useOrderCashBoxes: () => ({ boxes: [], required: false, loading: false, failed: false }),
}));

import { FuelLoadForm } from './FuelLoadForm';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  permissions.canWrite = true;
  carsQuery.current = DEFAULT_CARS;
});

beforeEach(() => {
  carsQuery.current = DEFAULT_CARS;
});

const LOAD = {
  fuelLoadId: 'f-1',
  carId: 'c-1',
  carPatent: 'AB123CD',
  loadedAt: '2026-10-10T12:00:00.000Z',
  fuelType: 'diesel',
  liters: 40,
  unitPrice: 1000,
  totalAmount: 40000,
  odometerKm: 1000,
  isFullTank: true,
  station: null,
  paymentMethod: 'card',
  receiptNumber: null,
  notes: null,
  cashMovementId: null,
} as unknown as FuelLoad;

const renderAt = (url: string) =>
  renderRoutes(
    <>
      <Route path="/fleet/fuel-loads/new" element={<FuelLoadForm />} />
      <Route path="/fleet/fuel-loads/:id/edit" element={<FuelLoadForm />} />
      <Route path="/fleet/fuel-loads" element={<p>lista de cargas</p>} />
      <Route path="/cars/details/:id" element={<p>ficha del vehículo</p>} />
    </>,
    [url],
  );

const setup = () => {
  queries.load.mockReturnValue(ok(undefined));
  queries.last.mockReturnValue(ok(undefined));
  const succeed = (_vars: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.();
  const create = mutation({ mutate: vi.fn(succeed) });
  const update = mutation({ mutate: vi.fn(succeed) });
  queries.create.mockReturnValue(create);
  queries.update.mockReturnValue(update);
  return { create, update };
};

const fillValid = () => {
  fireEvent.change(screen.getByLabelText(/^Vehículo/), { target: { value: 'c-1' } });
  fireEvent.change(screen.getByLabelText(/^Litros/), { target: { value: '40' } });
  fireEvent.change(screen.getByLabelText(/^Precio por litro/), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText(/^Importe total/), { target: { value: '40000' } });
  fireEvent.change(screen.getByLabelText(/^Kilometraje/), { target: { value: '1000' } });
};

describe('FuelLoadForm', () => {
  it('el alta es una página en secciones', () => {
    setup();
    renderAt('/fleet/fuel-loads/new');
    expect(screen.getByRole('heading', { level: 1, name: 'Nueva carga de combustible' })).toBeInTheDocument();
    for (const section of ['Vehículo y combustible', 'Litros e importe', 'Kilometraje', 'Pago y comprobante']) {
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeInTheDocument();
    }
  });

  it('enviar vacío muestra los errores y no llama a la API', async () => {
    const { create } = setup();
    renderAt('/fleet/fuel-loads/new');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar carga' }));
    expect(await screen.findByText('Elegí el vehículo')).toBeInTheDocument();
    expect(screen.getByText('Tienen que ser más que cero')).toBeInTheDocument();
    expect(screen.getByText('Tiene que ser mayor a cero')).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText(/^Vehículo/)).toHaveFocus());
  });

  it('un kilometraje por encima del tope del back se rechaza antes de enviar', async () => {
    const { create } = setup();
    renderAt('/fleet/fuel-loads/new');
    fillValid();
    fireEvent.change(screen.getByLabelText(/^Kilometraje/), { target: { value: '2000001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar carga' }));
    expect(await screen.findByText(/No puede pasar de/)).toBeInTheDocument();
    expect(create.mutate).not.toHaveBeenCalled();
  });

  it('manda el mismo cuerpo que el modal y vuelve a la lista', async () => {
    const { create } = setup();
    renderAt('/fleet/fuel-loads/new');
    fillValid();
    // 12:00 hora argentina (UTC-3) viaja como 15:00 UTC
    fireEvent.change(screen.getByLabelText(/^Fecha y hora/), { target: { value: '2026-10-10T12:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar carga' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toEqual({
      carId: 'c-1',
      loadedAt: '2026-10-10T15:00:00.000Z',
      fuelType: undefined,
      liters: 40,
      unitPrice: 1000,
      totalAmount: 40000,
      odometerKm: 1000,
      isFullTank: true,
      station: null,
      paymentMethod: 'card',
      receiptNumber: null,
      notes: null,
      cashBoxId: undefined,
    });
    expect(await screen.findByText('lista de cargas')).toBeInTheDocument();
    expect(notifySuccess).toHaveBeenCalledWith('Carga registrada');
  });

  it('con ?carId= el vehículo queda fijo y al guardar vuelve a la ficha del vehículo', async () => {
    const { create } = setup();
    renderRoutes(
      <>
        <Route path="/fleet/fuel-loads/new" element={<FuelLoadForm />} />
        <Route path="/cars/details/:id" element={<p>ficha del vehículo</p>} />
      </>,
      [{ pathname: '/fleet/fuel-loads/new', search: '?carId=c-1', state: { from: '/cars/details/c-1' } }],
    );
    const car = screen.getByLabelText(/^Vehículo/);
    expect(car).toHaveValue('c-1');
    expect(car).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Litros/), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText(/^Precio por litro/), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/^Importe total/), { target: { value: '40000' } });
    fireEvent.change(screen.getByLabelText(/^Kilometraje/), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar carga' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect(create.mutate.mock.calls[0][0]).toMatchObject({ carId: 'c-1' });
    expect(await screen.findByText('ficha del vehículo')).toBeInTheDocument();
  });

  it('la edición carga la carga, bloquea el vehículo y actualiza por id', async () => {
    const { update } = setup();
    queries.load.mockReturnValue(ok(LOAD));
    renderAt('/fleet/fuel-loads/f-1/edit');
    expect(screen.getByRole('heading', { level: 1, name: 'Editar carga de combustible' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Vehículo/)).toBeDisabled();
    expect(screen.getByLabelText(/^Litros/)).toHaveValue(40);
    fireEvent.change(screen.getByLabelText(/^Estación/), { target: { value: 'YPF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toMatchObject({
      id: 'f-1',
      body: { liters: 40, totalAmount: 40000, station: 'YPF', paymentMethod: 'card' },
    });
    expect(await screen.findByText('lista de cargas')).toBeInTheDocument();
  });

  it('al pasar de la edición de una carga a la de otra, el formulario se arma con la segunda y guarda su id', async () => {
    const { update } = setup();
    const other = { ...LOAD, fuelLoadId: 'f-2', liters: 20, totalAmount: 20000 } as FuelLoad;
    queries.load.mockImplementation((id: string) => ok(id === 'f-1' ? LOAD : other));
    const { router } = renderAt('/fleet/fuel-loads/f-1/edit');
    expect(screen.getByLabelText(/^Litros/)).toHaveValue(40);
    await act(() => router.navigate('/fleet/fuel-loads/f-2/edit'));
    await waitFor(() => expect(screen.getByLabelText(/^Litros/)).toHaveValue(20));
    fireEvent.change(screen.getByLabelText(/^Estación/), { target: { value: 'YPF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0]).toMatchObject({ id: 'f-2', body: { liters: 20, station: 'YPF' } });
  });

  it('si fallan los vehículos lo dice con «Reintentar» y no dibuja el formulario', () => {
    setup();
    carsQuery.current = { ...failed(carsRefetch), isPending: false };
    renderAt('/fleet/fuel-loads/new');
    expect(screen.queryByLabelText(/^Litros/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(carsRefetch).toHaveBeenCalled();
  });

  it('un error de recarga con datos en caché no desmonta el formulario: avisa en línea y reintenta', () => {
    setup();
    carsQuery.current = { ...DEFAULT_CARS, error: new Error('boom'), refetch: carsRefetch };
    queries.load.mockReturnValue(ok(LOAD));
    renderAt('/fleet/fuel-loads/f-1/edit');
    expect(screen.getByLabelText(/^Litros/)).toHaveValue(40);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos actualizar los vehículos');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(carsRefetch).toHaveBeenCalled();
  });

  it('en edición el vehículo actual tiene su opción aunque la lista no lo traiga', () => {
    setup();
    carsQuery.current = ok([]);
    queries.load.mockReturnValue(ok(LOAD));
    renderAt('/fleet/fuel-loads/f-1/edit');
    const select = screen.getByLabelText<HTMLSelectElement>(/^Vehículo/);
    expect(select.value).toBe('c-1');
    expect(select.options[select.selectedIndex].textContent).toBe('AB123CD');
  });

  it('carga y error al traer la carga', () => {
    setup();
    queries.load.mockReturnValue(loading());
    renderAt('/fleet/fuel-loads/f-1/edit');
    expect(screen.getByRole('status')).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    queries.load.mockReturnValue(failed(refetch));
    renderAt('/fleet/fuel-loads/f-1/edit');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('sin distribuidora elegida no muestra el formulario', () => {
    setup();
    permissions.canWrite = false;
    renderAt('/fleet/fuel-loads/new');
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Litros/)).not.toBeInTheDocument();
  });
});
