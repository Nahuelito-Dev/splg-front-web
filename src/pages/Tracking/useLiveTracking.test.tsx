import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as TrackingQueries from '../../services/queries/tracking';
import { liveVehicle } from '../../test/liveFleetFixtures';
import { LIVE_FLEET_POLL_MS, LIVE_FLEET_REFRESH_MS, useLiveTracking } from './useLiveTracking';

const socket = vi.hoisted(() => ({
  isOnline: true,
  handlers: new Map<string, (payload: unknown) => void>(),
}));
const perms = vi.hoisted(() => ({ needsDistributor: false, readOnly: false, isSuperAdminRole: false }));
const api = vi.hoisted(() => ({ getLiveFleet: vi.fn() }));
const queries = vi.hoisted(() => ({ options: [] as unknown[] }));

vi.mock('../../context/useSocketContext', () => ({
  useSocketContext: () => ({
    isOnline: socket.isOnline,
    subscribe: (event: string, handler: (payload: unknown) => void) => {
      socket.handlers.set(event, handler);
      return () => socket.handlers.delete(event);
    },
  }),
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => perms,
}));
vi.mock('../../hooks/usePermissions', () => ({ usePermissions: () => perms }));
vi.mock('../../services/api/tracking', () => api);
vi.mock('../../services/queries/tracking', async (importOriginal) => {
  const original = await importOriginal<typeof TrackingQueries>();
  return {
    ...original,
    useLiveFleet: (options: Parameters<(typeof TrackingQueries)['useLiveFleet']>[0]) => {
      queries.options.push(options);
      return original.useLiveFleet({ ...options, refetchInterval: false });
    },
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  socket.isOnline = true;
  socket.handlers.clear();
  Object.assign(perms, { needsDistributor: false, readOnly: false, isSuperAdminRole: false });
  api.getLiveFleet.mockReset();
  queries.options = [];
});

const emit = (event: string, payload: unknown) => act(() => socket.handlers.get(event)?.(payload));

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useLiveTracking(), { wrapper });
};

const fleet = (...vehicles: ReturnType<typeof liveVehicle>[]) => ({
  generatedAt: '2026-11-21T16:00:00.000Z',
  vehicles,
});

describe('useLiveTracking', () => {
  it('trae los vehículos y les pone encima la posición que llega por el socket (pedido u hoja)', async () => {
    api.getLiveFleet.mockResolvedValue(fleet(liveVehicle()));
    const { result } = setup();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));
    expect(result.current.vehicles[0].location?.lat).toBe(-27.35);

    emit('order:driver-location', {
      orderId: 'o-2',
      driverId: 'user-1',
      lat: -27.5,
      lng: -55.7,
      at: '2026-11-21T16:01:00.000Z',
    });
    expect(result.current.vehicles[0].location).toEqual({ lat: -27.5, lng: -55.7, at: '2026-11-21T16:01:00.000Z' });
    // El chofer tiene un vehículo en uso: su pedido no se dibuja aparte.
    expect(result.current.looseOrders).toEqual([]);

    emit('route-sheet:driver-location', {
      sheetId: 'sheet-1',
      driverUserId: 'user-1',
      lat: -27.6,
      lng: -55.6,
      at: '2026-11-21T16:02:00.000Z',
    });
    expect(result.current.vehicles[0].location?.lat).toBe(-27.6);
  });

  it('una posición del socket más vieja que la de la API no la pisa', async () => {
    api.getLiveFleet.mockResolvedValue(fleet(liveVehicle()));
    const { result } = setup();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));
    emit('route-sheet:driver-location', {
      sheetId: 'sheet-1',
      driverUserId: 'user-1',
      lat: -20,
      lng: -50,
      at: '2026-11-21T15:00:00.000Z',
    });
    expect(result.current.vehicles[0].location?.lat).toBe(-27.35);
  });

  it('un evento del socket más viejo que otro del mismo chofer no hace retroceder el marcador', async () => {
    // Sin posición de la API: sólo cuentan los dos eventos del socket.
    api.getLiveFleet.mockResolvedValue(fleet(liveVehicle({ location: null })));
    const { result } = setup();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));
    const sheetAt = (lat: number, at: string) =>
      emit('route-sheet:driver-location', { sheetId: 'sheet-1', driverUserId: 'user-1', lat, lng: -55.6, at });
    sheetAt(-27.6, '2026-11-21T16:05:00.000Z');
    sheetAt(-27.1, '2026-11-21T16:04:00.000Z');
    expect(result.current.vehicles[0].location).toEqual({ lat: -27.6, lng: -55.6, at: '2026-11-21T16:05:00.000Z' });
    // También entre los dos canales: uno viejo por el pedido no pisa al de la hoja.
    emit('order:driver-location', {
      orderId: 'o-2',
      driverId: 'user-1',
      lat: -27.2,
      lng: -55,
      at: '2026-11-21T16:03:00.000Z',
    });
    expect(result.current.vehicles[0].location?.lat).toBe(-27.6);
    // Uno más nuevo sí avanza.
    sheetAt(-27.7, '2026-11-21T16:06:00.000Z');
    expect(result.current.vehicles[0].location?.lat).toBe(-27.7);
  });

  it('el marcador de un pedido suelto tampoco retrocede con un evento viejo', async () => {
    api.getLiveFleet.mockResolvedValue(fleet());
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const orderAt = (lat: number, at: string) =>
      emit('order:driver-location', { orderId: 'o-9', driverId: 'otro', lat, lng: -55, at });
    orderAt(-27.6, '2026-11-21T16:05:00.000Z');
    orderAt(-27.1, '2026-11-21T16:04:00.000Z');
    expect(result.current.looseOrders.map((o) => o.lat)).toEqual([-27.6]);
  });

  it('el pedido de un chofer sin vehículo en uso queda como pedido suelto', async () => {
    api.getLiveFleet.mockResolvedValue(fleet(liveVehicle()));
    const { result } = setup();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));
    emit('order:driver-location', { orderId: 'o-9', driverId: 'otro', lat: -27, lng: -55, at: '2026-11-21T16:01:00Z' });
    expect(result.current.looseOrders.map((o) => o.orderId)).toEqual(['o-9']);
  });

  it('un evento de pedido o de hoja vuelve a pedir la lista, juntando la ráfaga', async () => {
    api.getLiveFleet.mockResolvedValue(fleet(liveVehicle()));
    const { result } = setup();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));
    expect(api.getLiveFleet).toHaveBeenCalledTimes(1);
    api.getLiveFleet.mockResolvedValue(fleet(liveVehicle({ status: 'waiting' })));
    emit('order:delivered', { orderId: 'o-2' });
    emit('route-sheet:stop-progress', { sheetId: 'sheet-1' });
    emit('route-sheet:closed', { sheetId: 'sheet-1' });
    await waitFor(() => expect(result.current.vehicles[0].status).toBe('waiting'));
    expect(api.getLiveFleet).toHaveBeenCalledTimes(2);
  });

  it('el administrador general descarta los eventos de una empresa y, sin distribuidora, no pide nada', async () => {
    Object.assign(perms, { needsDistributor: true, isSuperAdminRole: true });
    const { result } = setup();
    emit('order:delivered', { orderId: 'o-2', distributorId: 'dist-a' });
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(api.getLiveFleet).not.toHaveBeenCalled();
    expect(result.current.needsDistributor).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.vehicles).toEqual([]);
  });

  it('un error del back queda como error, no como lista vacía', async () => {
    api.getLiveFleet.mockImplementation(() => Promise.reject(new Error('403')));
    const { result } = setup();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it('con el socket caído o en modo soporte se sondea más seguido', () => {
    api.getLiveFleet.mockResolvedValue(fleet());
    setup();
    expect(queries.options.at(-1)).toMatchObject({ enabled: true, refetchInterval: LIVE_FLEET_REFRESH_MS });
    cleanup();
    socket.isOnline = false;
    setup();
    expect(queries.options.at(-1)).toMatchObject({ refetchInterval: LIVE_FLEET_POLL_MS });
    cleanup();
    socket.isOnline = true;
    perms.readOnly = true;
    setup();
    expect(queries.options.at(-1)).toMatchObject({ refetchInterval: LIVE_FLEET_POLL_MS });
  });
});
