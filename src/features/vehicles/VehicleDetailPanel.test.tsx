import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok } from '../../test/pageTest';
import { LIVE_NOW, liveVehicle } from '../../test/liveFleetFixtures';
import { VehicleDetailPanel } from './VehicleDetailPanel';

const state = vi.hoisted(() => ({
  inboxDrivers: true,
  fleet: { allowed: true, known: true },
  needsDistributor: false,
  car: null as unknown,
  documents: null as unknown,
  cargoPhoto: null as string | null,
  asked: [] as string[],
  carCalls: 0,
}));

vi.mock('../chat/useInboxAccess', () => ({
  useInboxAccess: () => ({ drivers: state.inboxDrivers, customers: false, configure: false, claims: false, any: true }),
}));
vi.mock('../chat/inbox/MessageButton', () => ({
  NewConversationModal: ({ target }: { target: { kind: string; userId: string; name: string } }) => (
    <div role="dialog" aria-label={`Mensaje a ${target.name}`} data-kind={target.kind} data-user={target.userId} />
  ),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: state.needsDistributor }),
  usePermiso: (code: string) => {
    state.asked.push(code);
    return state.fleet;
  },
}));
vi.mock('../../services/queries/cars', () => ({
  useCar: () => {
    state.carCalls += 1;
    return state.car;
  },
}));
vi.mock('../../services/queries/fleet', () => ({ useCarDocuments: vi.fn(() => state.documents) }));
vi.mock('../../services/queries/photos', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePhotoLink: () => ({ data: { url: state.cargoPhoto } }),
}));

const CAR = {
  car_id: 'car-1',
  car_brand: 'Toyota',
  car_model: 'Hilux',
  type_car: 'Camioneta',
  car_year: 2021,
  car_color: 'Blanco',
  car_capacity: 950,
  fleet_status: 'active',
  odometer_km: 84210,
  fuel_type: 'diesel',
  user: { full_name: 'Carlos Ruiz' },
};
const task = (over: Record<string, unknown>) => ({
  taskId: 't-1',
  status: 'scheduled',
  plan: { name: 'Seguro' },
  dueAt: '2026-12-10T03:00:00.000Z',
  dueKm: null,
  expirationStatus: 'due_soon',
  ...over,
});

afterEach(() => {
  cleanup();
  Object.assign(state, {
    inboxDrivers: true,
    fleet: { allowed: true, known: true },
    needsDistributor: false,
    car: null,
    documents: null,
    cargoPhoto: null,
    asked: [],
    carCalls: 0,
  });
});

const renderPanel = (vehicle = liveVehicle(), props: Partial<Parameters<typeof VehicleDetailPanel>[0]> = {}) =>
  render(
    <MemoryRouter>
      <VehicleDetailPanel vehicle={vehicle} now={LIVE_NOW} {...props} />
    </MemoryRouter>,
  );

describe('VehicleDetailPanel: encabezado', () => {
  it('patente, estado, chofer y las dos acciones', () => {
    const { container } = renderPanel();
    expect(screen.getByRole('region', { name: 'Detalle de AB104EJ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AB104EJ' })).toBeInTheDocument();
    const header = within(container.querySelector('header') as HTMLElement);
    expect(header.getByText('En ruta')).toBeInTheDocument();
    expect(header.getByText('Carlos Ruiz')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Llamar al chofer Carlos Ruiz' })).toHaveAttribute(
      'href',
      'tel:+5493764123456',
    );
    expect(screen.getByRole('button', { name: 'Chat con el chofer' })).toBeInTheDocument();
  });

  it('sin teléfono no hay enlace para llamar: el botón explica por qué', () => {
    const vehicle = liveVehicle();
    renderPanel({ ...vehicle, driver: { ...vehicle.driver, phone: null } });
    expect(screen.queryByRole('link', { name: /Llamar/ })).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Llamar al chofer/ });
    expect(button).toHaveAttribute('title', 'El chofer no tiene un teléfono cargado');
  });

  it('«Chat con el chofer» abre la conversación con el usuario del chofer', () => {
    renderPanel();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chat con el chofer' }));
    const dialog = screen.getByRole('dialog', { name: 'Mensaje a Carlos Ruiz' });
    expect(dialog).toHaveAttribute('data-kind', 'driver');
    expect(dialog).toHaveAttribute('data-user', 'user-1');
  });

  it('quien no atiende el canal de choferes no ve el botón de chat', () => {
    state.inboxDrivers = false;
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Chat con el chofer' })).not.toBeInTheDocument();
  });
});

describe('VehicleDetailPanel: pestaña Envío', () => {
  it('carga en por ciento sobre la foto, la carga abierta, el recorrido con tiempo restante y las paradas', () => {
    const { container } = renderPanel();
    expect(screen.getByRole('tab', { name: 'Envío' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('vehicle-load-percent')).toHaveTextContent('80 %');
    expect(container.querySelector('img[src="https://fotos.test/hilux.jpg"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /Carga N.º 7/ })).toHaveAttribute('href', '/truck-loads/load-1');
    expect(screen.getByTestId('vehicle-remaining')).toHaveTextContent('Faltan 57 min');
    expect(screen.getByText(/Hoja de ruta N.º 3 · salió 09:05 · última parada 14:00/)).toBeInTheDocument();
    expect(screen.getByText('1 de 3 entregadas · faltan 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver hoja de ruta' })).toHaveAttribute(
      'href',
      '/route-sheets?date=2026-11-21&view=sheet&sheet=sheet-1',
    );
    expect(within(screen.getByRole('list', { name: 'Paradas' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('sin hoja ni carga abierta: lo dice y no muestra tiempo restante', () => {
    renderPanel(
      liveVehicle({
        status: 'waiting',
        sheet: null,
        stops: [],
        load: {
          truckLoadId: null,
          truckLoadNumber: null,
          truckLoadStatus: null,
          fullUnits: 0,
          emptyUnits: 0,
          defectiveUnits: 0,
          unitsOnBoard: 0,
          capacityUnits: null,
          percent: null,
        },
      }),
    );
    expect(screen.getByText('Esperando')).toBeInTheDocument();
    expect(screen.getByText('Sin carga abierta')).toBeInTheDocument();
    expect(screen.getByText('Sin hoja de ruta ni pedidos en curso.')).toBeInTheDocument();
    expect(screen.queryByTestId('vehicle-remaining')).not.toBeInTheDocument();
    expect(screen.getByText('Sin paradas asignadas')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Foto de la carga' })).not.toBeInTheDocument();
  });

  it('la foto de la carga sólo aparece si el back tiene una', () => {
    const { unmount } = renderPanel();
    expect(screen.queryByRole('region', { name: 'Foto de la carga' })).not.toBeInTheDocument();
    unmount();
    state.cargoPhoto = 'https://fotos.test/carga.jpg';
    renderPanel();
    const section = screen.getByRole('region', { name: 'Foto de la carga' });
    expect(within(section).getByRole('img', { name: 'Foto de la carga N.º 7' })).toHaveAttribute(
      'src',
      'https://fotos.test/carga.jpg',
    );
  });

  it('tocar una parada la informa para resaltarla en el mapa', () => {
    const onSelectStop = vi.fn();
    renderPanel(liveVehicle(), { onSelectStop, selectedStopId: 'o-2' });
    const stops = within(screen.getByRole('list', { name: 'Paradas' })).getAllByRole('button');
    expect(stops[1]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(stops[2]);
    expect(onSelectStop).toHaveBeenCalledWith('o-3');
  });
});

describe('VehicleDetailPanel: pestañas Vehículo y Documentos', () => {
  it('Vehículo: carga, error con reintentar y los datos de la ficha', () => {
    state.car = loading();
    const { unmount } = renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Vehículo' }));
    expect(screen.queryByText('Marca y modelo')).not.toBeInTheDocument();
    unmount();

    const refetch = vi.fn();
    state.car = failed(refetch);
    const second = renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Vehículo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
    second.unmount();

    state.car = ok(CAR);
    renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Vehículo' }));
    expect(screen.getByText('Toyota Hilux')).toBeInTheDocument();
    expect(screen.getByText('84.210 km')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir la ficha del vehículo' })).toHaveAttribute(
      'href',
      '/cars/details/car-1',
    );
  });

  it('Documentos: vencimientos con su estado y el aviso si está inhabilitado', () => {
    state.documents = ok({
      carId: 'car-1',
      isLocked: true,
      tasks: [
        task({}),
        task({ taskId: 't-2', plan: { name: 'VTV' }, expirationStatus: 'expired' }),
        task({ taskId: 't-3', plan: { name: 'Service' }, dueAt: null, dueKm: 90000, expirationStatus: null }),
        task({ taskId: 't-4', plan: { name: 'Vieja' }, status: 'cancelled' }),
      ],
    });
    renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Inhabilitado por documentación vencida');
    const items = within(screen.getByRole('list', { name: 'Documentación del vehículo' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Seguro');
    expect(items[0]).toHaveTextContent('Por vencer');
    expect(items[1]).toHaveTextContent('Vencido');
    expect(items[2]).toHaveTextContent('A los 90.000 km');
    expect(screen.queryByText('Vieja')).not.toBeInTheDocument();
  });

  it('Documentos: vacío, error y administrador general sin distribuidora', () => {
    state.documents = ok({ carId: 'car-1', isLocked: false, tasks: [] });
    const first = renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(screen.getByText('Sin documentación cargada')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    first.unmount();

    state.documents = failed();
    const second = renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    second.unmount();

    state.needsDistributor = true;
    state.documents = loading();
    renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
  });
});

describe('VehicleDetailPanel: pestañas según el permiso de flota', () => {
  const tabNames = () => screen.getAllByRole('tab').map((tab) => tab.textContent);

  it('con `flota.ver` están las tres', () => {
    renderPanel();
    expect(tabNames()).toEqual(['Envío', 'Vehículo', 'Documentos']);
    expect(state.asked).toContain('flota.ver');
  });

  it('sin `flota.ver` queda sólo «Envío»: no se ofrece lo que la API contestaría con 403, ni se pide', () => {
    state.fleet = { allowed: false, known: true };
    state.car = ok(CAR);
    renderPanel();
    expect(tabNames()).toEqual(['Envío']);
    expect(screen.getByTestId('vehicle-load-percent')).toHaveTextContent('80 %');
    expect(state.carCalls).toBe(0);
  });

  it('mientras no se saben los permisos no se esconde nada', () => {
    state.fleet = { allowed: false, known: false };
    renderPanel();
    expect(tabNames()).toEqual(['Envío', 'Vehículo', 'Documentos']);
  });

  it('si el permiso se pierde estando en «Vehículo», vuelve a «Envío»', () => {
    state.car = ok(CAR);
    const { rerender } = renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Vehículo' }));
    expect(screen.getByText('Toyota Hilux')).toBeInTheDocument();
    state.fleet = { allowed: false, known: true };
    rerender(
      <MemoryRouter>
        <VehicleDetailPanel vehicle={liveVehicle()} now={LIVE_NOW} />
      </MemoryRouter>,
    );
    expect(tabNames()).toEqual(['Envío']);
    expect(screen.getByRole('tab', { name: 'Envío' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('vehicle-load-percent')).toBeInTheDocument();
  });
});
