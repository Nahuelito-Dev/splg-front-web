import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, ok } from '../../../test/pageTest';
import { liveVehicle } from '../../../test/liveFleetFixtures';
import { TrackingMap } from './TrackingMap';

const state = vi.hoisted(() => ({ canPath: true, path: null as unknown, pathIds: [] as (string | undefined)[] }));
vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermiso: () => ({ allowed: state.canPath, known: true }),
}));
vi.mock('../../../services/queries/routeSheets', () => ({
  useRouteSheetPath: (id: string | undefined) => {
    state.pathIds.push(id);
    return state.path;
  },
}));

afterEach(() => {
  cleanup();
  Object.assign(state, { canPath: true, path: null, pathIds: [] });
});

const NO_PATH = { data: undefined, isError: false };
const second = liveVehicle({
  carId: 'car-2',
  patent: 'AC222BB',
  driver: { deliveryId: 'del-2', userId: 'user-2', name: 'Dora', phone: null, photoUrl: null },
  location: { lat: -27.4, lng: -55.95, at: null },
});
const looseOrder = {
  orderId: 'o9000000-aaaa',
  driverId: 'd9000000-bbbb',
  lat: -27.31,
  lng: -55.9,
  at: '2026-11-15T13:05:09.000Z',
};

const base = { selectedCarId: null, onSelectVehicle: vi.fn(), looseOrders: [] };

describe('TrackingMap', () => {
  it('dibuja cada vehículo con posición en su lugar y con su patente; el que no tiene posición no se dibuja', () => {
    state.path = NO_PATH;
    const without = liveVehicle({ carId: 'car-3', patent: 'AD333CC', location: null });
    render(<TrackingMap {...base} vehicles={[liveVehicle(), second, without]} />);
    expect(screen.getByTestId('google-map')).toHaveAttribute('data-gestures', 'greedy');
    const markers = screen.getAllByTestId('map-marker');
    expect(markers.map((m) => m.dataset.lat)).toEqual(['-27.35', '-27.4']);
    expect(screen.getByRole('button', { name: /^AB104EJ · Carlos Ruiz · posición de las 13:00/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AC222BB · Dora' })).toBeInTheDocument();
    expect(screen.queryByText('AD333CC')).not.toBeInTheDocument();
    // Sin elegir ninguno no se pide ningún recorrido (cuenta contra el cupo diario).
    expect(state.pathIds).toEqual([]);
    expect(screen.queryByTestId('map-polyline')).not.toBeInTheDocument();
  });

  it('tocar un vehículo lo elige', () => {
    state.path = NO_PATH;
    const onSelectVehicle = vi.fn();
    render(<TrackingMap {...base} vehicles={[liveVehicle(), second]} onSelectVehicle={onSelectVehicle} />);
    fireEvent.click(screen.getByRole('button', { name: 'AC222BB · Dora' }));
    expect(onSelectVehicle).toHaveBeenCalledWith('car-2');
  });

  it('con uno elegido muestra sus paradas numeradas y el recorrido por calles de su hoja', () => {
    state.path = ok({ encodedPolyline: 'abc123' });
    const onSelectStop = vi.fn();
    render(
      <TrackingMap {...base} vehicles={[liveVehicle(), second]} selectedCarId="car-1" onSelectStop={onSelectStop} />,
    );
    expect(state.pathIds).toContain('sheet-1');
    const lines = screen.getAllByTestId('map-polyline');
    expect(lines.map((l) => l.dataset.encoded)).toEqual(['abc123', 'abc123']);
    fireEvent.click(screen.getByRole('button', { name: '2. Bruno Díaz' }));
    expect(onSelectStop).toHaveBeenCalledWith('o-2');
    // Las paradas del otro vehículo no se dibujan: 3 paradas + 2 vehículos.
    expect(screen.getAllByTestId('map-marker')).toHaveLength(5);
  });

  it('si el recorrido falla (o no hay permiso para pedirlo) une lo que falta en línea punteada', () => {
    state.path = failed();
    const { unmount } = render(<TrackingMap {...base} vehicles={[liveVehicle()]} selectedCarId="car-1" />);
    let line = screen.getByTestId('map-polyline');
    expect(line).toHaveAttribute('data-dashed', 'true');
    // Posición + la parada en camino + la pendiente (la entregada no).
    expect(line).toHaveAttribute('data-points', '3');
    unmount();

    state.canPath = false;
    state.path = NO_PATH;
    state.pathIds = [];
    render(<TrackingMap {...base} vehicles={[liveVehicle()]} selectedCarId="car-1" />);
    expect(state.pathIds).toEqual([undefined]);
    line = screen.getByTestId('map-polyline');
    expect(line).toHaveAttribute('data-dashed', 'true');
  });

  it('un pedido que manda posición sin vehículo en uso se sigue viendo, con su pedido y su hora', () => {
    state.path = NO_PATH;
    render(<TrackingMap {...base} vehicles={[]} looseOrders={[looseOrder]} />);
    const marker = screen.getByTestId('map-marker');
    expect(marker.dataset.lat).toBe('-27.31');
    expect(screen.queryByTestId('tracking-marker-info')).not.toBeInTheDocument();
    fireEvent.click(marker);
    const info = screen.getByTestId('tracking-marker-info');
    expect(info).toHaveTextContent('Pedido');
    expect(info).toHaveTextContent('Última actualización: 10:05');
    expect(info).toHaveTextContent('Sin vehículo en uso');
    fireEvent.click(marker);
    expect(screen.queryByTestId('tracking-marker-info')).not.toBeInTheDocument();
  });
});
