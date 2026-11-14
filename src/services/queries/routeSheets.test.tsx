import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execution, planDay, sheet, uuid } from '../../test/routeSheetFixtures';
import { ApiError } from '../api/errors';

const api = vi.hoisted(() => ({
  setRouteSheetSequence: vi.fn(),
  moveRouteSheetStop: vi.fn(),
  cancelRouteSheet: vi.fn(),
  confirmRouteSheet: vi.fn(),
  proposeRoutePlan: vi.fn(),
  startRouteSheet: vi.fn(),
  failRouteSheetStop: vi.fn(),
  closeRouteSheet: vi.fn(),
}));
const orders = vi.hoisted(() => ({ updateOrder: vi.fn(), cancelOrder: vi.fn() }));
vi.mock('../api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...orders,
}));
vi.mock('../api/routeSheets', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));

import { queryKeys } from './queryKeys';
import type { RoutePlanDay } from '../api/types';
import {
  routePlanKeys,
  routeSheetKeys,
  useCancelAwaitingOrder,
  useCancelRouteSheet,
  useCloseRouteSheet,
  useConfirmRouteSheet,
  useFailRouteSheetStop,
  useMoveRouteSheetStop,
  useProposeRoutePlan,
  useRescheduleAwaitingOrder,
  useSetRouteSheetSequence,
  useStartRouteSheet,
  withEtas,
} from './routeSheets';

const setup = <T,>(hook: () => T) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(hook, { wrapper });
  return { client, invalidate, result };
};
const invalidated = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey[0]);

beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()));

describe('hooks de hojas de ruta', () => {
  it('reordenar manda la versión que se vio, guarda la hoja que devuelve el back y refresca día, hojas y pedidos', async () => {
    const current = sheet({ version: 7 });
    const saved = sheet({ version: 8 });
    api.setRouteSheetSequence.mockResolvedValue(saved);
    const { client, invalidate, result } = setup(useSetRouteSheetSequence);
    await result.current.mutateAsync({ sheet: current, orderIds: [uuid(102), uuid(101)], locked: [uuid(101)] });
    expect(api.setRouteSheetSequence).toHaveBeenCalledWith(current.id, {
      version: 7,
      orderIds: [uuid(102), uuid(101)],
      locked: [uuid(101)],
    });
    expect(client.getQueryData(routeSheetKeys.detail(current.id))).toEqual(saved);
    expect(invalidated(invalidate)).toEqual(
      expect.arrayContaining([queryKeys.routePlans.all[0], queryKeys.routeSheets.all[0], queryKeys.orders.all[0]]),
    );
  });

  it('mover manda las dos versiones y guarda origen y destino', async () => {
    const source = sheet({ id: uuid(1), version: 2 });
    const target = sheet({ id: uuid(2), version: 5 });
    api.moveRouteSheetStop.mockResolvedValue({ source: { ...source, version: 3 }, target: { ...target, version: 6 } });
    const { client, result } = setup(useMoveRouteSheetStop);
    await result.current.mutateAsync({ sheet: source, orderId: uuid(101), target });
    expect(api.moveRouteSheetStop).toHaveBeenCalledWith(uuid(1), uuid(101), {
      version: 2,
      targetSheetId: uuid(2),
      targetVersion: 5,
      position: undefined,
      acceptLateStops: false,
    });
    expect(client.getQueryData<{ version: number }>(routeSheetKeys.detail(uuid(2)))?.version).toBe(6);
  });

  it('ante un 409 de versión recarga el día y las hojas (la pantalla avisa)', async () => {
    api.confirmRouteSheet.mockRejectedValue(
      new ApiError(409, ['Otro administrador cambió esta hoja'], 'ROUTE_SHEET_VERSION_CONFLICT'),
    );
    const { invalidate, result } = setup(useConfirmRouteSheet);
    await expect(result.current.mutateAsync({ sheet: sheet() })).rejects.toBeInstanceOf(ApiError);
    expect(invalidated(invalidate)).toEqual(
      expect.arrayContaining([queryKeys.routePlans.all[0], queryKeys.routeSheets.all[0]]),
    );
  });

  it('otro 409 no recarga nada', async () => {
    api.confirmRouteSheet.mockRejectedValue(new ApiError(409, ['No es borrador'], 'ROUTE_SHEET_NOT_EDITABLE'));
    const { invalidate, result } = setup(useConfirmRouteSheet);
    await expect(result.current.mutateAsync({ sheet: sheet() })).rejects.toBeInstanceOf(ApiError);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('si la hoja está tomada (ROUTE_SHEET_BUSY) reintenta solo y sigue con la respuesta buena', async () => {
    const busy = new ApiError(409, ['La hoja se está editando'], 'ROUTE_SHEET_BUSY');
    api.confirmRouteSheet.mockRejectedValueOnce(busy).mockResolvedValueOnce(sheet({ status: 'confirmed' }));
    const { result } = setup(useConfirmRouteSheet);
    const confirmed = await result.current.mutateAsync({ sheet: sheet(), acceptLateStops: true });
    expect(confirmed.status).toBe('confirmed');
    expect(api.confirmRouteSheet).toHaveBeenCalledTimes(2);
    expect(api.confirmRouteSheet).toHaveBeenLastCalledWith(uuid(1), { version: 3, acceptLateStops: true });
  });

  it('un 409 que no es de cerrojo no se reintenta', async () => {
    api.confirmRouteSheet.mockRejectedValue(new ApiError(409, ['No se puede'], 'ROUTE_SHEET_NOT_CONFIRMABLE'));
    const { result } = setup(useConfirmRouteSheet);
    await expect(result.current.mutateAsync({ sheet: sheet() })).rejects.toBeTruthy();
    expect(api.confirmRouteSheet).toHaveBeenCalledTimes(1);
  });

  it('la vista previa de la propuesta no refresca nada; la real sí', async () => {
    api.proposeRoutePlan.mockResolvedValueOnce({ dryRun: true }).mockResolvedValueOnce({ dryRun: false });
    const { invalidate, result } = setup(useProposeRoutePlan);
    await result.current.mutateAsync({ date: '2026-11-14', dryRun: true });
    expect(invalidate).not.toHaveBeenCalled();
    await result.current.mutateAsync({ date: '2026-11-14', dryRun: false });
    expect(api.proposeRoutePlan).toHaveBeenLastCalledWith('2026-11-14', false);
    expect(invalidated(invalidate)).toContain(queryKeys.routePlans.all[0]);
  });

  it('mover deja en el día las versiones nuevas de las dos hojas, sin esperar a que se vuelva a pedir', async () => {
    const source = sheet({ id: uuid(1), version: 2 });
    const target = sheet({ id: uuid(2), version: 5, stops: [] });
    const { client, result } = setup(useMoveRouteSheetStop);
    client.setQueryData(routePlanKeys.day('2026-11-14'), planDay({ sheets: [source, target] }));
    api.moveRouteSheetStop.mockResolvedValue({ source: { ...source, version: 3 }, target: { ...target, version: 6 } });
    await result.current.mutateAsync({ sheet: source, orderId: uuid(101), target });
    const day = client.getQueryData<RoutePlanDay>(routePlanKeys.day('2026-11-14'));
    expect(day?.sheets.map((s) => [s.id, s.version])).toEqual([
      [uuid(1), 3],
      [uuid(2), 6],
    ]);
  });

  it('una hoja cancelada sale del día en la caché', async () => {
    const current = sheet({ id: uuid(1) });
    api.cancelRouteSheet.mockResolvedValue({ ...current, status: 'dissolved', version: 4 });
    const { client, result } = setup(useCancelRouteSheet);
    client.setQueryData(routePlanKeys.day('2026-11-14'), planDay({ sheets: [current, sheet({ id: uuid(2) })] }));
    await result.current.mutateAsync(current);
    expect(client.getQueryData<RoutePlanDay>(routePlanKeys.day('2026-11-14'))?.sheets.map((s) => s.id)).toEqual([
      uuid(2),
    ]);
  });

  it('iniciar manda acknowledgeShortages sólo si se aceptaron los faltantes y refresca día, hojas y pedidos', async () => {
    api.startRouteSheet.mockResolvedValue({ sheetId: uuid(1), alreadyStarted: false, droppedOrderIds: [] });
    const { invalidate, result } = setup(useStartRouteSheet);
    await result.current.mutateAsync({ sheetId: uuid(1) });
    await result.current.mutateAsync({ sheetId: uuid(1), acknowledgeShortages: true });
    expect(api.startRouteSheet).toHaveBeenNthCalledWith(1, uuid(1), { acknowledgeShortages: false });
    expect(api.startRouteSheet).toHaveBeenNthCalledWith(2, uuid(1), { acknowledgeShortages: true });
    expect(invalidated(invalidate)).toEqual(
      expect.arrayContaining([queryKeys.routePlans.all[0], queryKeys.routeSheets.all[0], queryKeys.orders.all[0]]),
    );
  });

  it('iniciar reintenta si la hoja está tomada y no reintenta los faltantes', async () => {
    api.startRouteSheet
      .mockRejectedValueOnce(new ApiError(409, ['Tomada'], 'ROUTE_SHEET_BUSY'))
      .mockRejectedValueOnce(new ApiError(409, ['Faltan garrafas'], 'ROUTE_SHEET_SHORTAGES'));
    const { result } = setup(useStartRouteSheet);
    await expect(result.current.mutateAsync({ sheetId: uuid(1) })).rejects.toBeInstanceOf(ApiError);
    expect(api.startRouteSheet).toHaveBeenCalledTimes(2);
  });

  it('no entregada y cerrar llaman a su endpoint y refrescan; un error no refresca', async () => {
    api.failRouteSheetStop.mockResolvedValue({ sheetId: uuid(1), orderId: uuid(102), nextOrderId: uuid(103) });
    api.closeRouteSheet.mockRejectedValue(new ApiError(409, ['No está en curso'], 'ROUTE_SHEET_NOT_IN_PROGRESS'));
    const failed = setup(useFailRouteSheetStop);
    await failed.result.current.mutateAsync({
      sheetId: uuid(1),
      orderId: uuid(102),
      body: { reason: 'customer_absent' },
    });
    expect(api.failRouteSheetStop).toHaveBeenCalledWith(uuid(1), uuid(102), { reason: 'customer_absent' });
    expect(failed.invalidate).toHaveBeenCalled();
    const closed = setup(useCloseRouteSheet);
    await expect(closed.result.current.mutateAsync({ sheetId: uuid(1), reason: 'Se rompió' })).rejects.toBeTruthy();
    expect(api.closeRouteSheet).toHaveBeenCalledWith(uuid(1), { reason: 'Se rompió' });
    expect(closed.invalidate).not.toHaveBeenCalled();
  });

  it('el seguimiento cuelga del detalle de la hoja: invalidar la hoja lo refresca', () => {
    expect(routeSheetKeys.execution(uuid(1)).slice(0, -1)).toEqual([...routeSheetKeys.detail(uuid(1))]);
  });

  it('withEtas cambia sólo la hora y el atraso de las paradas que vienen en el evento', () => {
    const current = execution();
    const next = withEtas(current, [{ orderId: uuid(103), etaAt: '2026-11-14T14:45:00.000Z', late: true }]);
    expect(next?.stops[2]).toMatchObject({ etaAt: '2026-11-14T14:45:00.000Z', late: true });
    expect(next?.stops[1]).toBe(current.stops[1]);
    expect(withEtas(undefined, [])).toBeUndefined();
  });

  it('pedidos que esperan al admin: cambiar la fecha y cancelar van por pedidos y refrescan la hoja y el día', async () => {
    orders.updateOrder.mockResolvedValue({});
    orders.cancelOrder.mockResolvedValue({});
    const moved = setup(useRescheduleAwaitingOrder);
    await moved.result.current.mutateAsync({ orderId: uuid(103), scheduledDate: '2026-11-16' });
    expect(orders.updateOrder).toHaveBeenCalledWith(uuid(103), { scheduledDate: '2026-11-16' });
    expect(invalidated(moved.invalidate)).toEqual(
      expect.arrayContaining([queryKeys.routePlans.all[0], queryKeys.routeSheets.all[0], queryKeys.orders.all[0]]),
    );
    const cancelled = setup(useCancelAwaitingOrder);
    await cancelled.result.current.mutateAsync({ orderId: uuid(103), reason: 'Ya no lo quiere' });
    expect(orders.cancelOrder).toHaveBeenCalledWith(uuid(103), { reason: 'Ya no lo quiere' });
  });
});
