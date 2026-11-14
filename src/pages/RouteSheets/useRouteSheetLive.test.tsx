import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteSheetExecution } from '../../services/api/types';
import { routeSheetKeys } from '../../services/queries/routeSheets';
import { queryKeys } from '../../services/queries/queryKeys';
import { execution, uuid } from '../../test/routeSheetFixtures';

const socket = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
  isOnline: true,
  superAdmin: false,
}));

vi.mock('../../context/useSocketContext', () => ({
  useSocketContext: () => ({
    isOnline: socket.isOnline,
    subscribe: (event: string, handler: (payload: unknown) => void) => {
      socket.handlers.set(event, handler);
      return () => socket.handlers.delete(event);
    },
  }),
}));
vi.mock('../../hooks/usePermissions', () => ({ usePermissions: () => ({ isSuperAdminRole: socket.superAdmin }) }));

import { useRouteSheetLive } from './useRouteSheetLive';

const emit = (event: string, payload: unknown) => socket.handlers.get(event)?.(payload);

const setup = () => {
  const client = new QueryClient();
  const current = execution();
  client.setQueryData(routeSheetKeys.execution(uuid(1)), current);
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useRouteSheetLive(uuid(1), current), { wrapper });
  return {
    client,
    invalidate,
    hook,
    read: () => client.getQueryData<RouteSheetExecution>(routeSheetKeys.execution(uuid(1))),
  };
};

beforeEach(() => {
  socket.handlers.clear();
  socket.isOnline = true;
  socket.superAdmin = false;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useRouteSheetLive', () => {
  it('eta-updated cambia las horas sin volver a pedir', () => {
    const { invalidate, read } = setup();
    emit('route-sheet:eta-updated', {
      sheetId: uuid(1),
      source: 'gps',
      stops: [{ orderId: uuid(103), etaAt: '2026-11-14T14:45:00.000Z', late: true }],
    });
    expect(read()?.stops[2]).toMatchObject({ etaAt: '2026-11-14T14:45:00.000Z', late: true });
    vi.advanceTimersByTime(1000);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('las horas de otra hoja no tocan esta', () => {
    const { read } = setup();
    const before = read();
    emit('route-sheet:eta-updated', {
      sheetId: uuid(2),
      source: 'gps',
      stops: [{ orderId: uuid(103), etaAt: 'x', late: true }],
    });
    expect(read()).toBe(before);
  });

  it('la posición del chofer llega con el GPS de un pedido de la hoja; la de otro pedido se ignora', () => {
    const { read } = setup();
    emit('order:driver-location', { orderId: uuid(999), driverId: 'd', lat: 1, lng: 2, at: 'a' });
    expect(read()?.driverLocation?.lat).toBe(-27.381);
    emit('order:driver-location', {
      orderId: uuid(102),
      driverId: 'd',
      lat: -27.4,
      lng: -55.9,
      at: '2026-11-14T12:05:00.000Z',
    });
    expect(read()?.driverLocation).toEqual({ lat: -27.4, lng: -55.9, at: '2026-11-14T12:05:00.000Z' });
  });

  it('cualquier otro evento de la hoja junta la ráfaga y refresca la hoja y el día una vez', () => {
    const { invalidate } = setup();
    emit('route-sheet:stop-progress', { sheetId: uuid(1), orderId: uuid(102), progress: 'delivered' });
    emit('route-sheet:updated', { sheetId: uuid(1) });
    emit('route-sheet:closed', { sheetId: uuid(1), reason: 'finished', releasedOrderIds: [] });
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: routeSheetKeys.detail(uuid(1)) }, { cancelRefetch: false });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.routePlans.all }, { cancelRefetch: false });
  });

  it('se suscribe a todos los eventos del contrato y los suelta al desmontar', () => {
    const { hook } = setup();
    for (const event of [
      'route-sheet:started',
      'route-sheet:stop-progress',
      'route-sheet:stop-failed',
      'route-sheet:updated',
      'route-sheet:eta-updated',
      'route-sheet:stop-late',
      'route-sheet:closed',
      'route-sheet:assigned',
      'route-sheet:wait-expired',
      'route-sheet:driver-location',
      'order:driver-location',
      'order:rescheduled',
    ]) {
      expect(socket.handlers.has(event)).toBe(true);
    }
    hook.unmount();
    expect(socket.handlers.size).toBe(0);
  });

  it('un evento de otra hoja no refresca nada', () => {
    const { invalidate } = setup();
    emit('route-sheet:stop-failed', { sheetId: uuid(2), orderId: uuid(102) });
    vi.advanceTimersByTime(500);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('route-sheet:driver-location mueve al chofer de esta hoja aunque no tenga parada en camino', () => {
    const { read } = setup();
    emit('route-sheet:driver-location', { sheetId: uuid(2), driverUserId: 'd', lat: 1, lng: 2, at: 'a' });
    expect(read()?.driverLocation?.lat).toBe(-27.381);
    emit('route-sheet:driver-location', {
      sheetId: uuid(1),
      driverUserId: 'd',
      lat: -27.39,
      lng: -55.95,
      at: '2026-11-14T12:10:00.000Z',
    });
    expect(read()?.driverLocation).toEqual({ lat: -27.39, lng: -55.95, at: '2026-11-14T12:10:00.000Z' });
  });

  it('order:rescheduled de un pedido de la hoja la refresca; el de otro pedido no', () => {
    const { invalidate } = setup();
    emit('order:rescheduled', { orderId: uuid(999), scheduledDate: '2026-11-16' });
    vi.advanceTimersByTime(500);
    expect(invalidate).not.toHaveBeenCalled();
    emit('order:rescheduled', { orderId: uuid(103), scheduledDate: '2026-11-16' });
    vi.advanceTimersByTime(500);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: routeSheetKeys.detail(uuid(1)) }, { cancelRefetch: false });
  });
});
