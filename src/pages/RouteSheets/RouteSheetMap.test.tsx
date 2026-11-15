import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import type { RouteSheetPath } from '../../services/api/types';
import { failed, loading, ok } from '../../test/pageTest';
import { stop, uuid } from '../../test/routeSheetFixtures';

const state = vi.hoisted(() => ({ path: undefined as unknown, asked: [] as (string | undefined)[] }));
vi.mock('../../services/queries/routeSheets', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouteSheetPath: (id: string | undefined) => {
    state.asked.push(id);
    return state.path;
  },
}));

vi.mock('../../common/components/map/FitBounds', () => ({
  FitBounds: ({ fitKey, scopeKey }: { fitKey?: string; scopeKey?: string }) => (
    <span data-testid="fit" data-key={fitKey} data-scope={scopeKey} />
  ),
}));

import { RouteSheetMap } from './RouteSheetMap';

const stops = [stop(1), stop(2), stop(3)];

const pathOf = (over: Partial<RouteSheetPath> = {}): RouteSheetPath => ({
  sheetId: uuid(1),
  version: 3,
  provider: 'google',
  distanceMeters: 18450,
  durationSeconds: 2310,
  encodedPolyline: '_p~iF~ps|U_ulLnnqC',
  legs: [],
  skippedOrderIds: [],
  warehouse: { warehouseId: uuid(900), lat: -27.36, lng: -55.9 },
  ...over,
});

const apiFailure = (status: number, code: string) => ({ ...failed(), error: new ApiError(status, ['x'], code) });

const draw = (props: Partial<Parameters<typeof RouteSheetMap>[0]> = {}) =>
  render(<RouteSheetMap sheetId={uuid(1)} stops={stops} selectedId={null} onSelect={vi.fn()} {...props} />);

const lines = () => screen.getAllByTestId('map-polyline');

beforeEach(() => {
  state.path = ok(pathOf());
  state.asked = [];
});
afterEach(cleanup);

describe('RouteSheetMap', () => {
  it('pide el recorrido de su hoja y lo dibuja por calles, del galpón a cada parada', () => {
    draw();
    expect(state.asked).toContain(uuid(1));
    expect(lines().map((l) => l.dataset.encoded)).toEqual(['_p~iF~ps|U_ulLnnqC', '_p~iF~ps|U_ulLnnqC']);
    expect(lines().every((l) => l.dataset.dashed === 'false')).toBe(true);
    expect(screen.getByRole('img', { name: 'Galpón: salida y vuelta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1. Cliente 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3. Cliente 3' })).toBeInTheDocument();
    expect(screen.getByTestId('route-path-line')).toHaveTextContent('Recorrido por calles: 18,5 km · 39 min de manejo');
  });

  it('avisa cuando el recorrido lo calculó OpenStreetMap', () => {
    state.path = ok(pathOf({ provider: 'osrm' }));
    draw();
    expect(screen.getByTestId('route-path-line')).toHaveTextContent('(calculado con OpenStreetMap)');
  });

  it('mientras se traza, las paradas van en línea punteada', () => {
    state.path = loading();
    draw();
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toHaveAttribute('data-dashed', 'true');
    expect(lines()[0]).toHaveAttribute('data-points', '3');
    expect(screen.getByTestId('route-path-line')).toHaveTextContent('Trazando el recorrido por calles…');
  });

  it.each([
    [429, 'ROUTE_PATH_DAILY_LIMIT', 'Se llegó al máximo de recorridos por calles del día'],
    [502, 'ROUTE_PROVIDER_FAILED', 'El servicio de mapas no respondió'],
    [503, 'ROUTE_PROVIDER_UNAVAILABLE', 'No hay un servicio de mapas configurado'],
  ])('con %i (%s) el mapa igual muestra las paradas unidas en línea punteada y lo avisa', (status, code, text) => {
    state.path = apiFailure(status, code);
    draw();
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toHaveAttribute('data-dashed', 'true');
    expect(screen.getAllByRole('button', { name: /Cliente/ })).toHaveLength(3);
    expect(screen.getByTestId('route-path-line')).toHaveTextContent(text);
    expect(screen.getByTestId('route-path-line')).toHaveTextContent('las paradas van unidas en línea recta');
  });

  it('si la recarga falla con el recorrido viejo en caché, no lo dibuja: línea punteada del orden actual y el aviso', () => {
    state.path = { ...apiFailure(502, 'ROUTE_PROVIDER_FAILED'), data: pathOf() };
    draw();
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toHaveAttribute('data-dashed', 'true');
    expect(lines()[0]).toHaveAttribute('data-encoded', '');
    expect(screen.queryByTestId('route-path-line')).toHaveTextContent('El servicio de mapas no respondió');
    expect(screen.queryByTestId('route-path-line')).not.toHaveTextContent('Recorrido por calles');
  });

  it('encuadra por hoja y por las paradas que hay: reordenarlas no vuelve a encuadrar', () => {
    const { rerender } = draw();
    const key = screen.getByTestId('fit').dataset.key;
    expect(screen.getByTestId('fit')).toHaveAttribute('data-scope', uuid(1));
    rerender(
      <RouteSheetMap sheetId={uuid(1)} stops={[stops[2], stops[0], stops[1]]} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId('fit').dataset.key).toBe(key);
    rerender(<RouteSheetMap sheetId={uuid(1)} stops={[stops[0], stops[1]]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByTestId('fit').dataset.key).not.toBe(key);
  });

  it('las paradas sin coordenadas no van al mapa y se nombran', () => {
    const sinUbicacion = stop(2, { lat: null, lng: null });
    state.path = ok(pathOf({ skippedOrderIds: [sinUbicacion.orderId] }));
    draw({ stops: [stop(1), sinUbicacion, stop(3)] });
    expect(screen.queryByRole('button', { name: '2. Cliente 2' })).not.toBeInTheDocument();
    expect(screen.getByTestId('route-path-skipped')).toHaveTextContent(
      'Cliente 2 no tiene ubicación: no está en el mapa ni en el recorrido.',
    );
  });

  it('tocar una parada en el mapa la elige; la elegida se agranda', () => {
    const onSelect = vi.fn();
    const { rerender } = draw({ onSelect });
    fireEvent.click(screen.getByRole('button', { name: '2. Cliente 2' }));
    expect(onSelect).toHaveBeenCalledWith(stops[1].orderId);
    rerender(<RouteSheetMap sheetId={uuid(1)} stops={stops} selectedId={stops[1].orderId} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: '2. Cliente 2' }).firstElementChild).toHaveClass('h-9');
    expect(screen.getByRole('button', { name: '1. Cliente 1' }).firstElementChild).toHaveClass('h-7');
  });

  it('en la calle muestra al chofer en su última posición', () => {
    draw({ driver: { lat: -27.37, lng: -55.91, at: '2026-11-14T13:05:00.000Z' } });
    expect(screen.getByRole('img', { name: 'Chofer · posición de las 10:05' })).toHaveAttribute('data-lat', '-27.37');
  });
});
