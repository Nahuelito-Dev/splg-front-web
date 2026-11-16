import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, mutation, ok } from '../../../test/pageTest';

const state = vi.hoisted(() => ({
  inUse: vi.fn(),
  create: vi.fn(),
  employees: vi.fn(),
  cylinders: vi.fn(),
  drivers: vi.fn(),
}));

vi.mock('../../../services/queries/employees', () => ({ useEmployees: () => state.employees() as unknown }));
vi.mock('../../../services/queries/fleet', () => ({
  useVehicleInUse: (...args: unknown[]) => state.inUse(...args) as unknown,
}));
vi.mock('../../../services/queries/truckLoads', () => ({ useCreateTruckLoad: () => state.create() as unknown }));
vi.mock('../../Stock/components/useStockOptions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useDriverOptions: () => state.drivers() as unknown,
  useWarehouseOptions: () => ({
    options: [{ value: 'w-1', label: 'Galpón Central' }],
    failed: false,
    refetch: vi.fn(),
  }),
  useCylinderOptions: () => state.cylinders() as unknown,
}));

import { OpenTruckLoadModal } from './OpenTruckLoadModal';

const DRIVERS = {
  options: [
    { value: 'd-1', label: 'Pedro Pérez' },
    { value: 'd-2', label: 'Sin camión' },
  ],
  limited: false,
  failed: false,
  refetch: vi.fn(),
};
const CYLINDERS = { options: [{ value: 'g-1', label: '10kg' }], limited: false, failed: false, refetch: vi.fn() };
const EN_USO = { carId: 'c-1', carPatent: 'AB123CD', carBrand: 'Iveco', carModel: 'Daily' };

const draw = () => render(<OpenTruckLoadModal open onClose={vi.fn()} onCreated={vi.fn()} />);

const setup = () => {
  state.drivers.mockReturnValue(DRIVERS);
  state.cylinders.mockReturnValue(CYLINDERS);
  state.employees.mockReturnValue(ok({ rows: [], total: 0 }));
  state.create.mockReturnValue(mutation());
  state.inUse.mockImplementation((deliveryId: string | undefined) =>
    deliveryId === 'd-1'
      ? ok(EN_USO)
      : deliveryId
        ? ok(null)
        : { ...ok(undefined), isPending: false, isSuccess: false },
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OpenTruckLoadModal: el camión es el que el chofer tiene en uso', () => {
  it('hasta elegir chofer el camión está deshabilitado y no ofrece vehículos', () => {
    setup();
    draw();
    const camion = screen.getByLabelText(/Camión/);
    expect(camion).toBeDisabled();
    expect(within(camion).getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Elegí el chofer para ver su camión en uso.')).toBeInTheDocument();
  });

  it('con el chofer elegido ofrece sólo su vehículo en uso, ya seleccionado', async () => {
    setup();
    draw();
    fireEvent.change(screen.getByLabelText(/Chofer/), { target: { value: 'd-1' } });
    const camion = screen.getByLabelText(/Camión/);
    await waitFor(() => expect(camion).toBeEnabled());
    expect(screen.getByRole('option', { name: /AB123CD · Iveco Daily/ })).toBeInTheDocument();
    expect(camion).toHaveValue('c-1');
    // Sólo el placeholder y el vehículo en uso: ningún otro camión de la flota.
    expect(within(camion).getAllByRole('option')).toHaveLength(2);
  });

  it('un chofer sin camión en uso deja el combo apagado y manda a asignárselo', () => {
    setup();
    draw();
    fireEvent.change(screen.getByLabelText(/Chofer/), { target: { value: 'd-2' } });
    expect(screen.getByLabelText(/Camión/)).toBeDisabled();
    expect(screen.getByText(/no tiene un camión en uso/)).toBeInTheDocument();
  });

  it('abrir la carga manda el camión en uso del chofer', async () => {
    setup();
    const create = mutation();
    state.create.mockReturnValue(create);
    draw();
    fireEvent.change(screen.getByLabelText(/Chofer/), { target: { value: 'd-1' } });
    await waitFor(() => expect(screen.getByLabelText(/Camión/)).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'g-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir carga' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect((create.mutate.mock.calls[0][0] as { body: unknown }).body).toMatchObject({
      carId: 'c-1',
      deliveryId: 'd-1',
    });
  });

  it('un renglón sólo de vacías (0 llenas) es válido, como en el back', async () => {
    setup();
    const create = mutation();
    state.create.mockReturnValue(create);
    draw();
    fireEvent.change(screen.getByLabelText(/Chofer/), { target: { value: 'd-1' } });
    await waitFor(() => expect(screen.getByLabelText(/Camión/)).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'g-1' } });
    fireEvent.change(screen.getByLabelText('Llenas que salen'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/Vacías/), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir carga' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
  });

  it('si falla la consulta del camión en uso lo dice y permite reintentar sin perder el formulario', () => {
    setup();
    const refetch = vi.fn();
    state.inUse.mockImplementation((deliveryId: string | undefined) => (deliveryId ? failed(refetch) : ok(undefined)));
    draw();
    fireEvent.change(screen.getByLabelText(/Chofer/), { target: { value: 'd-1' } });
    expect(screen.getByLabelText(/Chofer/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('avisa cuando hay más choferes o garrafas que los 100 que se muestran', () => {
    setup();
    state.drivers.mockReturnValue({ ...DRIVERS, limited: true });
    state.cylinders.mockReturnValue({ ...CYLINDERS, limited: true });
    draw();
    expect(screen.getByText('Se muestran los primeros 100 choferes.')).toBeInTheDocument();
    expect(screen.getByText('Se muestran las primeras 100 garrafas.')).toBeInTheDocument();
  });
});
