import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportSession } from './types';

// El cliente HTTP real (interceptores incluidos) con su entorno simulado, como en `httpClient.test.ts`: lo que se
// prueba es que un error de GraphQL (que viaja con 200) tenga los mismos efectos que su par REST.
vi.mock('../../store/store', () => ({
  store: { dispatch: vi.fn(), getState: () => ({ auth: { role: 'super_admin', uid: 'uid-sa' } }) },
}));
const getCurrentIdToken = vi.fn<[boolean | undefined], Promise<string | null>>();
vi.mock('../../firebase/providers', () => ({
  getCurrentIdToken: (force?: boolean) => getCurrentIdToken(force),
  logOutFirebase: () => Promise.resolve(),
}));
vi.mock('../../utils/notifications', () => ({ notify: { warn: vi.fn(), info: vi.fn() } }));
const captureException = vi.hoisted(() => vi.fn<[unknown, unknown?], void>());
vi.mock('@sentry/react', () => ({ captureException }));
const invalidateQueries = vi.fn();
const clearCache = vi.fn();
vi.mock('../queries/queryClient', () => ({
  queryClient: { clear: () => void clearCache(), invalidateQueries: (arg: unknown) => void invalidateQueries(arg) },
}));

const { http, SESSION_EXPIRED_MESSAGE } = await import('./httpClient');
const { store } = await import('../../store/store');
const { supportMode } = await import('./supportMode');
const { ApiError } = await import('./errors');
const { getReportsOverview } = await import('./reports');

const OVERVIEW = {
  salesSummary: {
    current: { totalSales: 1500.5, totalOrders: 3, averageTicket: 500.17 },
    previous: null,
  },
  salesByDriver: { rows: [], totals: { totalOrders: 0, totalSales: 0 } },
};

const ok = (cfg: InternalAxiosRequestConfig, data: unknown) =>
  Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config: cfg });

/** Un error de GraphQL como lo arma el back: con 200, `data: null` y el estado equivalente en `extensions`. */
const gqlError = (statusCode: number | undefined, code: string, message = 'x') => ({
  data: null,
  errors: [{ message, extensions: statusCode === undefined ? { code } : { code, statusCode } }],
});

const useAdapter = (adapter: (cfg: InternalAxiosRequestConfig) => Promise<unknown>) => {
  const fn = vi.fn(adapter);
  http.defaults.adapter = fn as unknown as AxiosAdapter;
  return fn;
};

const errorOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as InstanceType<typeof ApiError>;
  }
  throw new Error('no falló');
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'token-vigente');
  getCurrentIdToken.mockReset().mockResolvedValue('token-vigente');
  captureException.mockReset();
  invalidateQueries.mockReset();
  clearCache.mockReset();
  vi.mocked(store.dispatch).mockClear();
  supportMode.reset();
});

describe('API GraphQL de Reportes: el pedido', () => {
  it('resumen y ventas por chofer en una sola consulta a /api/graphql, con el rango como variables', async () => {
    const adapter = useAdapter((cfg) => ok(cfg, { data: OVERVIEW }));

    expect(await getReportsOverview({ from: '2026-10-01', to: '2026-10-31' })).toEqual(OVERVIEW);

    expect(adapter).toHaveBeenCalledTimes(1);
    const cfg = adapter.mock.calls[0][0];
    expect(cfg.method).toBe('post');
    expect(cfg.url).toBe('http://localhost:3100/api/graphql');
    expect(cfg.headers.Authorization).toBe('Bearer token-vigente');
    expect(cfg.headers['X-Client-Source']).toBe('panel-app');
    const body = JSON.parse(String(cfg.data)) as { query: string; variables: unknown };
    expect(body.query).toContain('query ReportsOverview');
    expect(body.query).toContain('salesSummary(from: $from, to: $to)');
    expect(body.query).toContain('salesByDriver(from: $from, to: $to)');
    expect(body.variables).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('un rango vacío no manda fechas: el back usa hoy', async () => {
    const adapter = useAdapter((cfg) => ok(cfg, { data: OVERVIEW }));
    await getReportsOverview({ from: '', to: '' });
    expect(JSON.parse(String(adapter.mock.calls[0][0].data))).toMatchObject({ variables: {} });
  });

  it('una respuesta sin datos ni errores no se toma como vacía', async () => {
    useAdapter((cfg) => ok(cfg, { data: null }));
    expect((await errorOf(getReportsOverview({}))).messages).toEqual(['La API no devolvió datos']);
  });
});

describe('API GraphQL de Reportes: un error con 200 sale como el de REST', () => {
  it('estado, code y texto del back', async () => {
    useAdapter((cfg) => ok(cfg, gqlError(403, 'PERMISSION_DENIED', 'No tenés permiso para Ver reportes')));
    const error = await errorOf(getReportsOverview({}));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.code).toBe('PERMISSION_DENIED');
    expect(error.messages).toEqual(['No tenés permiso para Ver reportes']);
  });

  it('el texto amigable del panel aplica igual (falta de empresa)', async () => {
    const message = 'Falta la distribuidora: enviá el header X-Distributor (slug o id)';
    useAdapter((cfg) => ok(cfg, gqlError(400, 'MISSING_DISTRIBUTOR', message)));
    expect((await errorOf(getReportsOverview({}))).missingDistributor).toBe(true);
  });

  it('un error de la consulta misma (sin estado) no dispara efectos', async () => {
    useAdapter((cfg) => ok(cfg, gqlError(undefined, 'GRAPHQL_VALIDATION_FAILED', 'Cannot query field "x"')));
    const error = await errorOf(getReportsOverview({}));
    expect(error.status).toBeNull();
    expect(error.code).toBe('GRAPHQL_VALIDATION_FAILED');
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('lo que Apollo rechaza con 400 (límites, CSRF) sale con el texto del back, no «Error 400»', async () => {
    useAdapter((cfg) =>
      Promise.reject(
        Object.assign(new Error('400'), {
          isAxiosError: true,
          config: cfg,
          response: {
            status: 400,
            headers: {},
            config: cfg,
            data: {
              errors: [{ message: 'La consulta es demasiado compleja', extensions: { code: 'QUERY_TOO_COMPLEX' } }],
            },
          },
        }),
      ),
    );
    const error = await errorOf(getReportsOverview({}));
    expect(error.status).toBe(400);
    expect(error.code).toBe('QUERY_TOO_COMPLEX');
    expect(error.messages).toEqual(['La consulta es demasiado compleja']);
  });
});

describe('API GraphQL de Reportes: los efectos del interceptor de REST', () => {
  it('401: renueva el token y reintenta una sola vez', async () => {
    getCurrentIdToken.mockImplementation((force?: boolean) =>
      Promise.resolve(force ? 'token-renovado' : 'token-vencido'),
    );
    const auths: string[] = [];
    useAdapter((cfg) => {
      auths.push(String(cfg.headers.Authorization));
      return cfg.headers.Authorization === 'Bearer token-renovado'
        ? ok(cfg, { data: OVERVIEW })
        : ok(cfg, gqlError(401, 'UNAUTHORIZED', 'El token venció'));
    });

    expect(await getReportsOverview({})).toEqual(OVERVIEW);
    expect(auths).toEqual(['Bearer token-vencido', 'Bearer token-renovado']);
    expect(localStorage.getItem('token')).toBe('token-renovado');
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('401 que sigue tras renovar: cierra la sesión con el motivo del back, sin un segundo reintento', async () => {
    getCurrentIdToken.mockImplementation((force?: boolean) => Promise.resolve(force ? 'renovado' : 'viejo'));
    const message = 'La cuenta está bloqueada. Comuníquese con la distribuidora.';
    const adapter = useAdapter((cfg) => ok(cfg, gqlError(401, 'UNAUTHORIZED', message)));

    const error = await errorOf(getReportsOverview({}));
    expect(error.status).toBe(401);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { errorMessage: message } }));
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('401 sin poder renovar: vuelve al login con el aviso de sesión vencida', async () => {
    getCurrentIdToken.mockResolvedValueOnce('token-vigente').mockResolvedValue(null);
    const adapter = useAdapter((cfg) => ok(cfg, gqlError(401, 'UNAUTHORIZED')));
    await errorOf(getReportsOverview({}));
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { errorMessage: SESSION_EXPIRED_MESSAGE } }),
    );
  });

  it('la sesión de soporte terminó: sale del modo soporte', async () => {
    supportMode.update({ id: 'ses-1', status: 'active', distributorName: 'Gas Norte' } as SupportSession);
    useAdapter((cfg) => ok(cfg, gqlError(403, 'SUPPORT_SESSION_ENDED')));
    await errorOf(getReportsOverview({}));
    expect(supportMode.activeId()).toBeNull();
  });

  it('MODULE_DISABLED: vuelve a pedir los módulos de la empresa', async () => {
    useAdapter((cfg) => ok(cfg, gqlError(403, 'MODULE_DISABLED')));
    const error = await errorOf(getReportsOverview({}));
    expect(error.moduleDisabled).toBe(true);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['companyModules'] });
  });

  it('500: se reporta a Sentry; un 4xx no', async () => {
    useAdapter((cfg) => ok(cfg, gqlError(500, 'INTERNAL_SERVER_ERROR', 'Error interno del servidor')));
    await errorOf(getReportsOverview({}));
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException.mock.calls[0]?.[1]).toMatchObject({ tags: { 'api.status': '500', 'api.method': 'POST' } });

    captureException.mockReset();
    useAdapter((cfg) => ok(cfg, gqlError(403, 'PERMISSION_DENIED')));
    await errorOf(getReportsOverview({}));
    expect(captureException).not.toHaveBeenCalled();
  });
});
