import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { liveVehicle } from '../../test/liveFleetFixtures';
import type { LiveVehicle } from '../../services/api/types';
import { Tracking } from './Tracking';

const state = vi.hoisted(() => ({
  desktop: true,
  granted: ['pedidos.ver'] as string[] | null,
  liveCalls: 0,
  tracking: {} as Record<string, unknown>,
  pool: { isLoading: false, isError: false, total: 4 } as Record<string, unknown>,
}));

vi.mock('@mui/material', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useMediaQuery: () => state.desktop,
}));
vi.mock('./useLiveTracking', () => ({
  useLiveTracking: () => {
    state.liveCalls += 1;
    return state.tracking;
  },
}));
vi.mock('./useAvailablePool', () => ({ useAvailablePool: () => state.pool }));
vi.mock('./components/AvailableOrdersPool', () => ({ AvailableOrdersPool: () => <p>pool de pedidos</p> }));
vi.mock('../../services/queries/routeSheets', () => ({
  useRouteSheetPath: () => ({ data: undefined, isError: false }),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // `null`: todavía no se saben los permisos.
  usePermiso: (code: string) =>
    state.granted === null ? { allowed: false, known: false } : { allowed: state.granted.includes(code), known: true },
}));
vi.mock('../../features/vehicles/VehicleDetailPanel', () => ({
  VehicleDetailPanel: ({ vehicle, showTitle }: { vehicle: LiveVehicle; showTitle: boolean }) => (
    <div data-testid="detail" data-title={String(showTitle)}>
      Detalle de {vehicle.patent}
    </div>
  ),
}));

const tracking = (over: Record<string, unknown> = {}) => ({
  isOnline: true,
  realtime: true,
  needsDistributor: false,
  vehicles: [liveVehicle(), liveVehicle({ carId: 'car-2', patent: 'AC222BB', status: 'waiting', location: null })],
  looseOrders: [],
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...over,
});

afterEach(() => {
  cleanup();
  state.desktop = true;
  state.granted = ['pedidos.ver'];
  state.liveCalls = 0;
  state.pool = { isLoading: false, isError: false, total: 4 };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <Tracking />
    </MemoryRouter>,
  );

describe('Seguimiento en vivo', () => {
  it('tres zonas: tarjetas de vehículos, mapa y detalle (vacío hasta elegir uno)', () => {
    state.tracking = tracking();
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Seguimiento en vivo' })).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Vehículos\s*2/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Disponibles\s*4/ })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Vehículos en uso' })).getAllByRole('article')).toHaveLength(2);
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(within(screen.getByTestId('vehicle-detail-zone')).getByText('Elegí un vehículo')).toBeInTheDocument();
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
  });

  it('elegir una tarjeta abre su detalle en la tercera zona; volver a tocarla lo cierra', () => {
    state.tracking = tracking();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ver el detalle de AB104EJ' }));
    const zone = within(screen.getByTestId('vehicle-detail-zone'));
    expect(zone.getByTestId('detail')).toHaveTextContent('Detalle de AB104EJ');
    expect(zone.getByTestId('detail')).toHaveAttribute('data-title', 'true');
    expect(screen.getByRole('button', { name: 'Ver el detalle de AB104EJ' })).toHaveAttribute('aria-pressed', 'true');
    // El mapa pasa a mostrar sus paradas.
    expect(screen.getByRole('button', { name: '2. Bruno Díaz' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver el detalle de AC222BB' }));
    expect(zone.getByTestId('detail')).toHaveTextContent('Detalle de AC222BB');
    fireEvent.click(screen.getByRole('button', { name: 'Ver el detalle de AC222BB' }));
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
  });

  it('elegir un vehículo en el mapa también abre su detalle', () => {
    state.tracking = tracking();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^AB104EJ · Carlos Ruiz/ }));
    expect(screen.getByTestId('detail')).toHaveTextContent('Detalle de AB104EJ');
  });

  it('si el vehículo elegido deja de estar en uso, el detalle se cierra solo', () => {
    state.tracking = tracking();
    const { rerender } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ver el detalle de AB104EJ' }));
    expect(screen.getByTestId('detail')).toBeInTheDocument();
    state.tracking = tracking({ vehicles: [] });
    rerender(
      <MemoryRouter>
        <Tracking />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
    expect(screen.getByText('No hay vehículos en uso')).toBeInTheDocument();
  });

  it('en pantalla chica no hay tercera zona: el detalle se abre en un panel lateral y se cierra', () => {
    state.desktop = false;
    state.tracking = tracking();
    renderPage();
    expect(screen.queryByTestId('vehicle-detail-zone')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver el detalle de AB104EJ' }));
    const dialog = screen.getByRole('dialog', { name: 'AB104EJ' });
    expect(within(dialog).getByTestId('detail')).toHaveAttribute('data-title', 'false');
    expect(within(dialog).getByText('Carlos Ruiz')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
  });

  it('cargando o con error el contador es un guion, no un 0; el error se muestra', () => {
    state.tracking = tracking({ vehicles: [], isLoading: true });
    const first = renderPage();
    expect(screen.getByRole('tab', { name: /Vehículos\s*–/ })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Cargando vehículos' })).toBeInTheDocument();
    first.unmount();
    state.tracking = tracking({ vehicles: [], isError: true, error: new Error('No tenés permiso') });
    renderPage();
    expect(screen.getByRole('tab', { name: /Vehículos\s*–/ })).toBeInTheDocument();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
  });

  it('sin tiempo real lo avisa, y la pestaña «Disponibles» conserva el pool de pedidos', () => {
    state.tracking = tracking({ isOnline: false, realtime: false });
    renderPage();
    expect(screen.getByText('Sin conexión en tiempo real')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Disponibles/ }));
    expect(screen.getByText('pool de pedidos')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Vehículos en uso' })).not.toBeInTheDocument();
  });

  it('sin `pedidos.ver` ni `despacho.gestionar` (entrando por la URL): explica el permiso que falta y no pide nada', () => {
    state.granted = ['flota.ver'];
    state.tracking = tracking();
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Seguimiento en vivo' })).toBeInTheDocument();
    expect(screen.getByText('No tenés permiso para el seguimiento en vivo')).toBeInTheDocument();
    expect(screen.getByText(/«Ver los pedidos» o «Gestionar el despacho»/)).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
    expect(state.liveCalls).toBe(0);
  });

  it('con uno solo de los dos permisos, o mientras no se saben, la pantalla se ve', () => {
    state.tracking = tracking();
    for (const granted of [['despacho.gestionar'], ['pedidos.ver'], null]) {
      state.granted = granted;
      const view = renderPage();
      expect(screen.getByRole('list', { name: 'Vehículos en uso' })).toBeInTheDocument();
      expect(screen.queryByText('No tenés permiso para el seguimiento en vivo')).not.toBeInTheDocument();
      view.unmount();
    }
  });
});
