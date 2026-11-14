import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './errors';
import {
  RouteSheetNotConfirmableError,
  addRouteSheetStop,
  cancelRouteSheet,
  closeRoutePlanDay,
  confirmAllRouteSheets,
  confirmRouteSheet,
  createRouteSheet,
  getLateOrders,
  getLoadSuggestion,
  getRoutePlanDay,
  getRoutePlanningSettings,
  getRouteSheet,
  listRouteSheets,
  moveRouteSheetStop,
  openRoutePlanDay,
  optimizeRouteSheet,
  patchRoutePlanningSettings,
  proposeRoutePlan,
  removeRouteSheetStop,
  reopenRouteSheet,
  setRouteSheetSequence,
  updateRouteSheet,
} from './routeSheets';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }));

vi.mock('./httpClient', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, http };
});

const V2 = expect.objectContaining({ baseURL: expect.stringContaining('/v2') as string }) as unknown;
const ID = 'b1b1b1b1-0000-4000-8000-000000000001';
const ORDER = 'a1a1a1a1-0000-4000-8000-000000000002';

const axiosError = (status: number, data: unknown) =>
  new AxiosError('fail', 'ERR', undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

describe('API de hojas de ruta (v2)', () => {
  beforeEach(() => {
    for (const fn of Object.values(http)) fn.mockReset().mockResolvedValue({ data: {} });
  });

  it('el día: leer, abrir, proponer (vista previa y real), cerrar, confirmar todas y tardíos', async () => {
    await getRoutePlanDay('2026-11-14');
    await openRoutePlanDay('2026-11-14');
    await proposeRoutePlan('2026-11-14', true);
    await proposeRoutePlan('2026-11-14', false);
    await closeRoutePlanDay('2026-11-14');
    await confirmAllRouteSheets('2026-11-14');
    await getLateOrders('2026-11-14');
    expect(http.get).toHaveBeenNthCalledWith(1, '/route-plans/2026-11-14', V2);
    expect(http.get).toHaveBeenNthCalledWith(2, '/route-plans/2026-11-14/late-orders', V2);
    expect(http.post).toHaveBeenNthCalledWith(1, '/route-plans/2026-11-14/open', undefined, V2);
    expect(http.post).toHaveBeenNthCalledWith(2, '/route-plans/2026-11-14/propose', { dryRun: true }, V2);
    expect(http.post).toHaveBeenNthCalledWith(3, '/route-plans/2026-11-14/propose', { dryRun: false }, V2);
    expect(http.post).toHaveBeenNthCalledWith(4, '/route-plans/2026-11-14/close', undefined, V2);
    expect(http.post).toHaveBeenNthCalledWith(5, '/route-plans/2026-11-14/confirm-all', undefined, V2);
  });

  it('parámetros: GET y PATCH de /route-planning/settings', async () => {
    await getRoutePlanningSettings();
    await patchRoutePlanningSettings({ enabled: 1 });
    expect(http.get).toHaveBeenCalledWith('/route-planning/settings', V2);
    expect(http.patch).toHaveBeenCalledWith('/route-planning/settings', { enabled: 1 }, V2);
  });

  it('lista las hojas del día con sus filtros y lee una, con su carga sugerida', async () => {
    await listRouteSheets({ date: '2026-11-14', status: 'dissolved', limit: 50 });
    await getRouteSheet(ID);
    await getLoadSuggestion(ID);
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      '/route-sheets',
      expect.objectContaining({ params: { date: '2026-11-14', status: 'dissolved', limit: 50 } }),
    );
    expect((http.get.mock.calls[0] as unknown[])[1]).toEqual(V2);
    expect(http.get).toHaveBeenNthCalledWith(2, `/route-sheets/${ID}`, V2);
    expect(http.get).toHaveBeenNthCalledWith(3, `/route-sheets/${ID}/load-suggestion`, V2);
  });

  it('codifica los segmentos de la ruta: un valor con barras no cambia de endpoint', async () => {
    await getRoutePlanDay('../../users');
    await getRouteSheet('x/../../admin');
    expect(http.get).toHaveBeenNthCalledWith(1, '/route-plans/..%2F..%2Fusers', V2);
    expect(http.get).toHaveBeenNthCalledWith(2, '/route-sheets/x%2F..%2F..%2Fadmin', V2);
  });

  it('toda edición viaja con la versión que se vio', async () => {
    await createRouteSheet({ planDate: '2026-11-14' });
    await updateRouteSheet(ID, { version: 3, carId: ORDER });
    await addRouteSheetStop(ID, { version: 3, orderId: ORDER, lock: false, acceptLateStops: false });
    await removeRouteSheetStop(ID, ORDER, 4);
    await moveRouteSheetStop(ID, ORDER, { version: 5, targetSheetId: ORDER, targetVersion: 2, acceptLateStops: true });
    await setRouteSheetSequence(ID, { version: 6, orderIds: [ORDER], locked: [] });
    await optimizeRouteSheet(ID, 7);
    await confirmRouteSheet(ID, { version: 8, acceptLateStops: false });
    await reopenRouteSheet(ID, 9);
    await cancelRouteSheet(ID, 10);
    expect(http.post).toHaveBeenNthCalledWith(1, '/route-sheets', { planDate: '2026-11-14' }, V2);
    expect(http.patch).toHaveBeenCalledWith(`/route-sheets/${ID}`, { version: 3, carId: ORDER }, V2);
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      `/route-sheets/${ID}/stops`,
      { version: 3, orderId: ORDER, lock: false, acceptLateStops: false },
      V2,
    );
    expect(http.delete).toHaveBeenCalledWith(
      `/route-sheets/${ID}/stops/${ORDER}`,
      expect.objectContaining({ data: { version: 4 } }),
    );
    expect(http.post).toHaveBeenNthCalledWith(
      3,
      `/route-sheets/${ID}/stops/${ORDER}/move`,
      { version: 5, targetSheetId: ORDER, targetVersion: 2, acceptLateStops: true },
      V2,
    );
    expect(http.put).toHaveBeenCalledWith(
      `/route-sheets/${ID}/sequence`,
      { version: 6, orderIds: [ORDER], locked: [] },
      V2,
    );
    expect(http.post).toHaveBeenNthCalledWith(4, `/route-sheets/${ID}/optimize`, { version: 7 }, V2);
    expect(http.post).toHaveBeenNthCalledWith(
      5,
      `/route-sheets/${ID}/confirm`,
      { version: 8, acceptLateStops: false },
      V2,
    );
    expect(http.post).toHaveBeenNthCalledWith(6, `/route-sheets/${ID}/reopen`, { version: 9 }, V2);
    expect(http.post).toHaveBeenNthCalledWith(7, `/route-sheets/${ID}/cancel`, { version: 10 }, V2);
  });

  it('confirmar: el 409 con violaciones llega como RouteSheetNotConfirmableError con cada regla', async () => {
    const violations = [{ code: 'late_stops', message: 'Una parada llega fuera de su franja', orderIds: [ORDER] }];
    http.post.mockRejectedValueOnce(
      axiosError(409, {
        statusCode: 409,
        message: 'No se puede confirmar la hoja',
        code: 'ROUTE_SHEET_NOT_CONFIRMABLE',
        violations,
      }),
    );
    const error: unknown = await confirmRouteSheet(ID, { version: 1, acceptLateStops: false }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RouteSheetNotConfirmableError);
    expect((error as RouteSheetNotConfirmableError).violations).toEqual(violations);
    expect((error as RouteSheetNotConfirmableError).messages).toEqual(['No se puede confirmar la hoja']);
  });

  it('confirmar: otro 409 (versión) sigue siendo el error de siempre', async () => {
    const original = axiosError(409, {
      message: 'Otro administrador cambió esta hoja',
      code: 'ROUTE_SHEET_VERSION_CONFLICT',
    });
    http.post.mockRejectedValueOnce(original);
    const error: unknown = await confirmRouteSheet(ID, { version: 1, acceptLateStops: false }).catch((e: unknown) => e);
    expect(error).toBe(original);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});
