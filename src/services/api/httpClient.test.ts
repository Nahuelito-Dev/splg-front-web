import { AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../store/store', () => ({ store: { dispatch: vi.fn() } }));
vi.mock('../../store/auth/thunks', () => ({ startLogOut: vi.fn() }));
const getCurrentIdToken = vi.fn<[boolean | undefined], Promise<string | null>>();
vi.mock('../../firebase/providers', () => ({ getCurrentIdToken: (force?: boolean) => getCurrentIdToken(force) }));

const { attachAuthHeaders, http, toPage, toQuery } = await import('./httpClient');

const response = (data: number[], headers: Record<string, string> = {}) =>
  ({ data, headers }) as unknown as AxiosResponse<number[]>;

describe('paginado', () => {
  it('lee el total de X-Total-Count', () => {
    expect(toPage(response([1, 2], { 'x-total-count': '231' }))).toEqual({ rows: [1, 2], total: 231 });
  });

  it('sin la cabecera, el total es lo que vino (nunca un número inventado)', () => {
    expect(toPage(response([1, 2, 3])).total).toBe(3);
  });

  it('página y tamaño pasan a limit/offset', () => {
    expect(toQuery({ page: 2, pageSize: 25 })).toEqual({ limit: 25, offset: 50 });
  });
});

const config = (skipDistributor?: boolean, isPublic?: boolean): InternalAxiosRequestConfig =>
  ({ headers: new AxiosHeaders(), skipDistributor, public: isPublic }) as InternalAxiosRequestConfig;

describe('attachAuthHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
    getCurrentIdToken.mockReset().mockResolvedValue(null);
  });

  it('con sesión de Firebase, manda el token vigente del SDK y lo guarda', async () => {
    localStorage.setItem('token', 'token-vencido');
    getCurrentIdToken.mockResolvedValue('token-renovado');
    const result = await attachAuthHeaders(config());
    expect(result.headers.Authorization).toBe('Bearer token-renovado');
    expect(localStorage.getItem('token')).toBe('token-renovado');
  });

  it('sin token, rechaza: no hay sesión iniciada', async () => {
    await expect(attachAuthHeaders(config())).rejects.toThrow('No hay sesión iniciada');
  });

  it('con token, lo manda como Bearer', async () => {
    localStorage.setItem('token', 'el-token');
    const result = await attachAuthHeaders(config());
    expect(result.headers.Authorization).toBe('Bearer el-token');
  });

  it('con una distribuidora elegida, la manda en X-Distributor', async () => {
    localStorage.setItem('token', 'el-token');
    localStorage.setItem('selectedDistributor', 'jeny-gas');
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Distributor']).toBe('jeny-gas');
  });

  it('un X-Distributor puesto en la llamada manda sobre el de «Ver como»', async () => {
    localStorage.setItem('token', 'el-token');
    localStorage.setItem('selectedDistributor', 'jeny-gas');
    const base = config();
    base.headers.set('X-Distributor', 'otra-empresa');
    const result = await attachAuthHeaders(base);
    expect(result.headers['X-Distributor']).toBe('otra-empresa');
  });

  it('sin distribuidora elegida, no manda el header', async () => {
    localStorage.setItem('token', 'el-token');
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Distributor']).toBeUndefined();
  });

  it('skipDistributor la omite aunque haya una elegida (llamadas de identidad, p. ej. el login)', async () => {
    localStorage.setItem('token', 'el-token');
    localStorage.setItem('selectedDistributor', 'slug-borrado-o-viejo');
    const result = await attachAuthHeaders(config(true));
    expect(result.headers['X-Distributor']).toBeUndefined();
    expect(result.headers.Authorization).toBe('Bearer el-token');
  });

  it('público sin sesión: sale igual, sin Authorization (p. ej. recuperar contraseña desde el login)', async () => {
    const result = await attachAuthHeaders(config(undefined, true));
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('público con sesión: igual manda el token (no hace daño)', async () => {
    localStorage.setItem('token', 'el-token');
    const result = await attachAuthHeaders(config(undefined, true));
    expect(result.headers.Authorization).toBe('Bearer el-token');
  });
});

describe('401 por token vencido', () => {
  beforeEach(() => {
    localStorage.clear();
    getCurrentIdToken.mockReset();
  });

  it('renueva el token y reintenta una vez antes de cerrar la sesión', async () => {
    localStorage.setItem('token', 'token-vencido');
    getCurrentIdToken.mockImplementation((force?: boolean) =>
      Promise.resolve(force ? 'token-renovado' : 'token-vencido'),
    );
    const auths: string[] = [];
    const adapter = vi.fn((cfg: InternalAxiosRequestConfig) => {
      auths.push(String(cfg.headers.Authorization));
      if (cfg.headers.Authorization === 'Bearer token-vencido') {
        const err = Object.assign(new Error('401'), {
          isAxiosError: true,
          config: cfg,
          response: { status: 401, data: { code: 'auth/id-token-expired' }, headers: {}, config: cfg },
        });
        return Promise.reject(err);
      }
      return Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config: cfg });
    });
    const res = await http.get('/orders', { adapter });
    expect(res.data).toEqual({ ok: true });
    expect(auths).toEqual(['Bearer token-vencido', 'Bearer token-renovado']);
    expect(localStorage.getItem('token')).toBe('token-renovado');
  });

  it('si Firebase no puede renovar, cierra la sesión', async () => {
    localStorage.setItem('token', 'token-vencido');
    getCurrentIdToken.mockResolvedValue(null);
    const adapter = vi.fn((cfg: InternalAxiosRequestConfig) =>
      Promise.reject(
        Object.assign(new Error('401'), {
          isAxiosError: true,
          config: cfg,
          response: { status: 401, data: {}, headers: {}, config: cfg },
        }),
      ),
    );
    await expect(http.get('/orders', { adapter })).rejects.toThrow('401');
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
  });
});
