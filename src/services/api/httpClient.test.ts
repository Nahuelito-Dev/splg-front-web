import { AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportSession } from './types';

const authRole = vi.hoisted(() => ({ value: 'super_admin' as string | null, uid: 'uid-sa' as string | null }));
vi.mock('../../store/store', () => ({
  store: { dispatch: vi.fn(), getState: () => ({ auth: { role: authRole.value, uid: authRole.uid } }) },
}));
vi.mock('../../store/auth/thunks', () => ({ startLogOut: vi.fn() }));
const getCurrentIdToken = vi.fn<[boolean | undefined], Promise<string | null>>();
const logOutFirebase = vi.fn<[], Promise<void>>();
vi.mock('../../firebase/providers', () => ({
  getCurrentIdToken: (force?: boolean) => getCurrentIdToken(force),
  logOutFirebase: () => logOutFirebase(),
}));
const clearCache = vi.fn();
const notifyWarn = vi.fn();
vi.mock('../../utils/notifications', () => ({
  notify: {
    warn: (m: string) => {
      notifyWarn(m);
    },
    info: vi.fn(),
  },
}));
vi.mock('../queries/queryClient', () => ({ queryClient: { clear: () => void clearCache() } }));

const { attachAuthHeaders, http, toPage, toQuery, SESSION_EXPIRED_MESSAGE } = await import('./httpClient');
const { store } = await import('../../store/store');
const { supportMode } = await import('./supportMode');
const { ownedCompany } = await import('./ownedCompany');

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

const config = (skipSupportSession?: boolean, isPublic?: boolean): InternalAxiosRequestConfig =>
  ({ headers: new AxiosHeaders(), skipSupportSession, public: isPublic }) as InternalAxiosRequestConfig;

const session = (status: SupportSession['status'], id = 'ses-1') =>
  ({ id, status, distributorName: 'Gas Norte' }) as SupportSession;

describe('attachAuthHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
    supportMode.reset();
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

  it('con una sesión de soporte activa, la manda en X-Support-Session', async () => {
    localStorage.setItem('token', 'el-token');
    supportMode.update(session('active'));
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Support-Session']).toBe('ses-1');
    expect(result.headers['X-Distributor']).toBeUndefined();
  });

  it('con el pedido pendiente (sin aprobar) todavía no manda el header', async () => {
    localStorage.setItem('token', 'el-token');
    supportMode.update(session('pending'));
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Support-Session']).toBeUndefined();
  });

  it('sin sesión de soporte no manda el header, ni el viejo X-Distributor de «Ver como»', async () => {
    localStorage.setItem('token', 'el-token');
    localStorage.setItem('selectedDistributor', 'jeny-gas');
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Support-Session']).toBeUndefined();
    expect(result.headers['X-Distributor']).toBeUndefined();
  });

  it('skipSupportSession la omite aunque haya una activa (identidad y el propio modo soporte)', async () => {
    localStorage.setItem('token', 'el-token');
    supportMode.update(session('active'));
    const result = await attachAuthHeaders(config(true));
    expect(result.headers['X-Support-Session']).toBeUndefined();
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
    logOutFirebase.mockReset().mockResolvedValue();
    clearCache.mockReset();
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

  const fail401With = (data: unknown) => (cfg: InternalAxiosRequestConfig) =>
    Promise.reject(
      Object.assign(new Error('401'), {
        isAxiosError: true,
        config: cfg,
        response: { status: 401, data, headers: {}, config: cfg },
      }),
    );
  const fail401 = fail401With({});

  it('si Firebase no puede renovar, vuelve al login con el aviso de sesión vencida', async () => {
    vi.mocked(store.dispatch).mockClear();
    localStorage.setItem('token', 'viejo');
    getCurrentIdToken.mockResolvedValue(null);
    await expect(http.get('/orders', { adapter: fail401 })).rejects.toThrow('401');
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { errorMessage: SESSION_EXPIRED_MESSAGE } }),
    );
  });

  it('un 401 que sigue tras renovar cierra la sesión sin reintentar de nuevo (nunca un bucle)', async () => {
    vi.mocked(store.dispatch).mockClear();
    getCurrentIdToken.mockImplementation((force?: boolean) => Promise.resolve(force ? 'renovado' : 'viejo'));
    const adapter = vi.fn(fail401With({ message: 'La cuenta está bloqueada. Comuníquese con la distribuidora.' }));
    await expect(http.get('/orders', { adapter })).rejects.toThrow('401');
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(getCurrentIdToken.mock.calls.filter(([force]) => force)).toHaveLength(1);
    // Renovó y sigue el 401: no es vencimiento, se muestra el motivo de la API.
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { errorMessage: 'La cuenta está bloqueada. Comuníquese con la distribuidora.' },
      }),
    );
  });

  it('un 401 persistente por distribuidora inválida muestra ese motivo, no «sesión venció»', async () => {
    vi.mocked(store.dispatch).mockClear();
    getCurrentIdToken.mockImplementation((force?: boolean) => Promise.resolve(force ? 'renovado' : 'viejo'));
    const message = "Distribuidora 'vieja' inválida o no disponible";
    await expect(http.get('/orders', { adapter: fail401With({ message }) })).rejects.toThrow('401');
    expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { errorMessage: message } }));
  });

  it('el cierre por 401 cierra de verdad: limpia la caché, el token y la sesión de Firebase', async () => {
    localStorage.setItem('token', 'viejo');
    getCurrentIdToken.mockResolvedValue(null);
    await expect(http.get('/orders', { adapter: fail401 })).rejects.toThrow('401');
    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(logOutFirebase).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it.each(['auth/too-many-requests', 'auth/internal-error'])(
    '%s al renovar no cierra la sesión: se rechaza el pedido',
    async (code) => {
      vi.mocked(store.dispatch).mockClear();
      getCurrentIdToken.mockImplementation((force?: boolean) =>
        force ? Promise.reject(Object.assign(new Error(code), { code })) : Promise.resolve('viejo'),
      );
      await expect(http.get('/orders', { adapter: fail401 })).rejects.toThrow('401');
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(logOutFirebase).not.toHaveBeenCalled();
    },
  );

  it('un refresh token revocado (auth/user-token-expired) sí cierra con el aviso de sesión vencida', async () => {
    vi.mocked(store.dispatch).mockClear();
    getCurrentIdToken.mockImplementation((force?: boolean) =>
      force
        ? Promise.reject(Object.assign(new Error('x'), { code: 'auth/user-token-expired' }))
        : Promise.resolve('viejo'),
    );
    await expect(http.get('/orders', { adapter: fail401 })).rejects.toThrow('401');
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { errorMessage: SESSION_EXPIRED_MESSAGE } }),
    );
  });

  it('varios pedidos vencidos a la vez comparten una sola renovación', async () => {
    let resolver: (t: string) => void = () => undefined;
    getCurrentIdToken.mockImplementation((force?: boolean) =>
      force ? new Promise<string>((r) => (resolver = r)) : Promise.resolve('viejo'),
    );
    const adapter = vi.fn((cfg: InternalAxiosRequestConfig) =>
      cfg.headers.Authorization === 'Bearer viejo'
        ? fail401(cfg)
        : Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config: cfg }),
    );
    const all = Promise.all([http.get('/a', { adapter }), http.get('/b', { adapter }), http.get('/c', { adapter })]);
    await vi.waitFor(() => expect(getCurrentIdToken.mock.calls.filter(([force]) => force)).toHaveLength(1));
    resolver('renovado');
    const results = await all;
    expect(results.map((r) => r.data as unknown)).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(getCurrentIdToken.mock.calls.filter(([force]) => force)).toHaveLength(1);
  });

  it('una falla de red al renovar no cierra la sesión', async () => {
    vi.mocked(store.dispatch).mockClear();
    localStorage.setItem('token', 'viejo');
    getCurrentIdToken.mockImplementation((force?: boolean) =>
      force
        ? Promise.reject(Object.assign(new Error('net'), { code: 'auth/network-request-failed' }))
        : Promise.resolve('viejo'),
    );
    await expect(http.get('/orders', { adapter: fail401 })).rejects.toThrow('401');
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('viejo');
  });
});

describe('modo soporte: la API dice que la sesión terminó', () => {
  const fail403With =
    (data: unknown, status = 403) =>
    (cfg: InternalAxiosRequestConfig) =>
      Promise.reject(
        Object.assign(new Error(String(status)), {
          isAxiosError: true,
          config: cfg,
          response: { status, data, headers: {}, config: cfg },
        }),
      );

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'el-token');
    getCurrentIdToken.mockReset().mockResolvedValue(null);
    notifyWarn.mockReset();
    supportMode.reset();
    supportMode.update(session('active'));
    clearCache.mockReset();
  });

  it.each(['SUPPORT_SESSION_ENDED', 'SUPPORT_SESSION_NOT_FOUND'])(
    '%s: sale del modo solo, vacía la caché y avisa',
    async (code) => {
      await expect(http.get('/orders', { adapter: fail403With({ code, message: 'x' }) })).rejects.toThrow();
      expect(supportMode.activeId()).toBeNull();
      expect(clearCache).toHaveBeenCalledTimes(1);
      expect(notifyWarn).toHaveBeenCalledWith(expect.stringContaining('La sesión de soporte terminó'));
    },
  );

  it('un 403 de sólo lectura no saca del modo (la sesión sigue)', async () => {
    const adapter = fail403With({ code: 'SUPPORT_READ_ONLY', message: 'Estás en modo soporte: es sólo lectura' });
    await expect(http.patch('/orders/1', {}, { adapter })).rejects.toThrow();
    expect(supportMode.activeId()).toBe('ses-1');
    expect(notifyWarn).not.toHaveBeenCalled();
  });

  it('la respuesta de una sesión vieja no corta la nueva', async () => {
    const adapter = (cfg: InternalAxiosRequestConfig) => {
      // Mientras viajaba el pedido, se cerró esa sesión y se abrió otra.
      supportMode.update(session('active', 'ses-2'));
      return fail403With({ code: 'SUPPORT_SESSION_ENDED', message: 'x' })(cfg);
    };
    await expect(http.get('/orders', { adapter })).rejects.toThrow();
    expect(supportMode.activeId()).toBe('ses-2');
  });
});

const OWN = { id: 'c-own', slug: 'prueba-orixtech', name: 'Distribuidora de prueba' };

describe('empresa propia: X-Distributor', () => {
  const fail403With = (data: unknown) => (cfg: InternalAxiosRequestConfig) =>
    Promise.reject(
      Object.assign(new Error('403'), {
        isAxiosError: true,
        config: cfg,
        response: { status: 403, data, headers: {}, config: cfg },
      }),
    );

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'el-token');
    supportMode.reset();
    ownedCompany.reset();
    authRole.value = 'super_admin';
    authRole.uid = 'uid-sa';
    getCurrentIdToken.mockReset().mockResolvedValue(null);
    clearCache.mockReset();
    notifyWarn.mockReset();
  });

  it('con la empresa propia elegida, todo pedido lleva su slug en X-Distributor', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    localStorage.setItem('token', 'el-token');
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Distributor']).toBe('prueba-orixtech');
    expect(result.headers['X-Support-Session']).toBeUndefined();
  });

  it('las llamadas de identidad y del modo soporte van sin él', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    localStorage.setItem('token', 'el-token');
    const result = await attachAuthHeaders(config(true));
    expect(result.headers['X-Distributor']).toBeUndefined();
  });

  it('con una sesión de soporte activa manda la sesión, no la empresa propia', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    localStorage.setItem('token', 'el-token');
    supportMode.update(session('active'));
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Support-Session']).toBe('ses-1');
    expect(result.headers['X-Distributor']).toBeUndefined();
  });

  it('una cuenta que no es administrador general nunca lo manda (aunque haya quedado guardado)', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    localStorage.setItem('token', 'el-token');
    authRole.value = 'admin';
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Distributor']).toBeUndefined();
  });

  it('entrar y salir vacía la caché y la elección sobrevive a la recarga (localStorage, no la URL)', () => {
    ownedCompany.enter(OWN, 'uid-sa');
    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('ownedCompany') ?? 'null')).toEqual({ ...OWN, ownerUid: 'uid-sa' });
    ownedCompany.exit();
    expect(clearCache).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('ownedCompany')).toBeNull();
    expect(notifyWarn).not.toHaveBeenCalled();
  });

  it('si la API corta la vigencia (403 SUPPORT_SESSION_REQUIRED con el encabezado), sale solo con aviso', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    localStorage.setItem('token', 'el-token');
    await expect(
      http.get('/orders', { adapter: fail403With({ code: 'SUPPORT_SESSION_REQUIRED', message: 'x' }) }),
    ).rejects.toThrow();
    expect(ownedCompany.getStored()).toBeNull();
    expect(notifyWarn).toHaveBeenCalledWith(expect.stringContaining('dejó de ser la empresa propia'));
  });

  it('otro 403 (por ejemplo, de permisos) no lo saca de la empresa propia', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    localStorage.setItem('token', 'el-token');
    await expect(http.get('/orders', { adapter: fail403With({ code: 'FORBIDDEN', message: 'x' }) })).rejects.toThrow();
    expect(ownedCompany.getFor('uid-sa')).toEqual(OWN);
  });

  it('otro administrador general en el mismo navegador no hereda el X-Distributor', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    localStorage.setItem('token', 'el-token');
    authRole.uid = 'uid-otro';
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Distributor']).toBeUndefined();
  });

  it('el valor en memoria no sobrevive a un localStorage.clear()', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    localStorage.clear();
    localStorage.setItem('token', 'el-token');
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Distributor']).toBeUndefined();
    expect(ownedCompany.getStored()).toBeNull();
  });
});

describe('empresa propia: identidad', () => {
  beforeEach(() => {
    localStorage.clear();
    ownedCompany.reset();
  });

  it('syncIdentity con la misma cuenta no toca nada', () => {
    ownedCompany.enter(OWN, 'uid-sa');
    ownedCompany.syncIdentity('uid-sa');
    expect(ownedCompany.getFor('uid-sa')).toEqual(OWN);
  });

  it('otra cuenta, deslogueo o falla de login: se borra en memoria y en el storage', () => {
    for (const uid of ['uid-otro', null]) {
      ownedCompany.enter(OWN, 'uid-sa');
      ownedCompany.syncIdentity(uid);
      expect(ownedCompany.getStored()).toBeNull();
      expect(localStorage.getItem('ownedCompany')).toBeNull();
    }
  });

  it('lo guardado sin dueño (formato viejo o tocado a mano) se ignora', () => {
    localStorage.setItem('ownedCompany', JSON.stringify(OWN));
    expect(ownedCompany.getStored()).toBeNull();
    expect(ownedCompany.getFor('uid-sa')).toBeNull();
  });
});

describe('empresa propia: entre pestañas', () => {
  beforeEach(() => {
    localStorage.clear();
    ownedCompany.reset();
    clearCache.mockReset();
  });

  /** Lo que hace el navegador cuando otra pestaña cambia el storage: escribe y dispara `storage` en esta. */
  const otherTab = (value: string | null) => {
    if (value === null) localStorage.removeItem('ownedCompany');
    else localStorage.setItem('ownedCompany', value);
    window.dispatchEvent(new StorageEvent('storage', { key: 'ownedCompany', newValue: value }));
  };

  it('si en otra pestaña se sale, esta deja de mandar el encabezado, vacía la caché y avisa a quien escucha', async () => {
    ownedCompany.enter(OWN, 'uid-sa');
    clearCache.mockReset();
    const listener = vi.fn();
    const unsubscribe = ownedCompany.subscribe(listener);
    otherTab(null);
    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalled();
    localStorage.setItem('token', 'el-token');
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Distributor']).toBeUndefined();
    unsubscribe();
  });

  it('si en otra pestaña se entra, esta empieza a mandarlo sin esperar nada', async () => {
    const listener = vi.fn();
    const unsubscribe = ownedCompany.subscribe(listener);
    otherTab(JSON.stringify({ ...OWN, ownerUid: 'uid-sa' }));
    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalled();
    localStorage.setItem('token', 'el-token');
    const result = await attachAuthHeaders(config());
    expect(result.headers['X-Distributor']).toBe('prueba-orixtech');
    unsubscribe();
  });

  it('un cambio de otra clave del storage no hace nada', () => {
    ownedCompany.enter(OWN, 'uid-sa');
    clearCache.mockReset();
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }));
    expect(clearCache).not.toHaveBeenCalled();
  });
});
