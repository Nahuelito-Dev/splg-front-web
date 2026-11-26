import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import { store } from '../../store/store';
import { logOut } from '../../store/auth';
import { SUPPORT_SESSION_GONE_CODES, SUPPORT_SESSION_HEADER, supportMode } from './supportMode';
import { OWNED_COMPANY_GONE_CODE, OWNED_COMPANY_HEADER, ownedCompany } from './ownedCompany';
import { getCurrentIdToken, logOutFirebase } from '../../firebase/providers';
import { esErrorDeSesion, SESSION_EXPIRED_MESSAGE } from '../../firebase/sessionErrors';
import { queryClient } from '../queries/queryClient';
import { queryKeys } from '../queries/queryKeys';
import { MODULE_DISABLED_CODE, toApiError } from './errors';
import { reportApiError } from '../../observability/apiErrors';

// Axios no trae estas opciones: las agregan `skipSupportSession` y `public` (ver `attachAuthHeaders`).
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Marca interna: el pedido ya se reintentó con un token renovado tras un 401. */
    reintentoConTokenNuevo?: boolean;
    /**
     * Las llamadas de identidad (¿quién es este token?) y las del propio modo soporte no
     * van con `X-Support-Session`: una sesión de soporte que terminó no puede tirar abajo
     * el login ni la consulta que pregunta justamente si terminó. Ver `getAdmin`.
     */
    skipSupportSession?: boolean;
    /**
     * Endpoint público (p. ej. `/email/password-reset` desde el login, CU-047):
     * no exige que haya una sesión iniciada. Si hay un token guardado igual se
     * manda (no hace daño), pero sin token la llamada sale igual en vez de
     * rechazarse antes de salir.
     */
    public?: boolean;
  }
}

/** Origen que la API espera del panel: el guard lo compara con el rol del token. */
const CLIENT_SOURCE = 'panel-app';

/** Cliente HTTP autenticado del panel. Todas las llamadas a la API pasan por acá. */
export const http = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json', 'X-Client-Source': CLIENT_SOURCE },
});

const clearLocalSession = () => {
  localStorage.removeItem('token');
};

export { SESSION_EXPIRED_MESSAGE };

/** Renovación en curso: los pedidos que fallan juntos esperan la misma, así hay una sola contra Firebase. */
let renovacion: Promise<string | null> | null = null;

/** Renueva el ID token a la fuerza. Null si no hay sesión o Firebase la da por inválida; cualquier otra falla (red, límite de intentos) se relanza. */
const renovarToken = (): Promise<string | null> => {
  renovacion ??= getCurrentIdToken(true)
    .catch((error: unknown) => {
      if (esErrorDeSesion(error)) return null;
      throw error;
    })
    .finally(() => {
      renovacion = null;
    });
  return renovacion;
};

/**
 * Cierra de verdad: token local, caché de la cuenta y sesión de Firebase (si no, la próxima
 * recarga re-entraría sola). El aviso se despacha antes del signOut para que no lo pise el
 * `onAuthStateChanged` de `useCheckAuth`.
 */
const cerrarSesion = (errorMessage: string) => {
  clearLocalSession();
  queryClient.clear();
  store.dispatch(logOut({ errorMessage }));
  void logOutFirebase().catch(() => undefined);
};

/**
 * El ID token de Firebase dura una hora: se pide al SDK en cada llamada (lo renueva solo
 * cuando está por vencer) y se guarda, para que el socket y la próxima carga usen el vigente.
 */
const vigenteOGuardado = async (force = false): Promise<string | null> => {
  const fresco = await getCurrentIdToken(force).catch(() => null);
  if (fresco) {
    localStorage.setItem('token', fresco);
    return fresco;
  }
  return localStorage.getItem('token');
};

/** Token y `X-Support-Session` de cada pedido. Aparte para poder probarlo sin armar un axios entero. */
export const attachAuthHeaders = async (config: InternalAxiosRequestConfig) => {
  // El reintento tras un 401 ya trae el token renovado a la fuerza: no se pisa.
  const token =
    config.reintentoConTokenNuevo && config.headers.Authorization
      ? String(config.headers.Authorization).replace(/^Bearer /, '')
      : await vigenteOGuardado();
  if (!token) {
    if (config.public) return config;
    return Promise.reject(new Error('No hay sesión iniciada'));
  }
  config.headers.Authorization = `Bearer ${token}`;
  // Modo soporte: mientras el administrador general tenga una sesión activa, todo pedido la lleva. La empresa la fija
  // la sesión en el back (no hay más `X-Distributor` para él).
  const supportSession = config.skipSupportSession ? null : supportMode.activeId();
  if (supportSession) config.headers[SUPPORT_SESSION_HEADER] = supportSession;
  // Empresa propia: el administrador general la opera como su admin con `X-Distributor`. Con una sesión de soporte
  // activa manda la sesión (la API haría lo mismo); las llamadas de identidad y del modo soporte van sin él.
  // Sólo la elegida por la cuenta logueada: otro administrador general en el mismo navegador no la hereda.
  if (!supportSession && !config.skipSupportSession) {
    const { role, uid } = store.getState().auth;
    const owned = role === 'super_admin' ? ownedCompany.getFor(uid) : null;
    if (owned) config.headers[OWNED_COMPANY_HEADER] = owned.slug;
  }
  return config;
};

http.interceptors.request.use(attachAuthHeaders);

interface BodyWithCode {
  code?: string;
}

/**
 * Los efectos de un error de la API: reporte a Sentry (5xx y red), un reintento con el token renovado tras un 401,
 * salir del modo soporte o de la empresa propia cuando la API los da por terminados, refrescar los módulos ante un
 * `MODULE_DISABLED` y cerrar la sesión. Lo usan el interceptor de respuesta (REST) y `graphqlRequest` (un error de
 * GraphQL viaja con 200 y se le pasa acá como el error HTTP equivalente). Resuelve con la respuesta del reintento, o
 * rechaza con el mismo error.
 */
export const handleApiError = async (error: unknown): Promise<AxiosResponse> => {
  // Sólo 5xx y fallas de red/timeout van a Sentry; un 4xx lo resuelve la pantalla.
  reportApiError(error);
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const code = (error.response?.data as BodyWithCode | undefined)?.code;
    const original = error.config;
    // Un 401 por token vencido se reintenta una vez con un token renovado antes de cerrar la sesión.
    if (status === 401 && original && !original.reintentoConTokenNuevo) {
      let renovado: string | null;
      try {
        renovado = await renovarToken();
      } catch {
        // Sin red no se puede renovar, pero la sesión sigue siendo válida: se deja el error al llamador.
        return Promise.reject(error);
      }
      if (renovado) {
        localStorage.setItem('token', renovado);
        original.reintentoConTokenNuevo = true;
        original.headers.Authorization = `Bearer ${renovado}`;
        return http.request(original);
      }
    }
    // La sesión de soporte con la que salió el pedido ya no sirve (revocada, vencida o inexistente): se sale del modo.
    const sentSession: unknown = original?.headers?.[SUPPORT_SESSION_HEADER];
    if (typeof sentSession === 'string' && code && SUPPORT_SESSION_GONE_CODES.has(code)) {
      supportMode.endedByApi(sentSession);
    }
    // La empresa del `X-Distributor` dejó de ser propia (la API ignoró el encabezado): se vuelve a la plataforma.
    const sentOwned: unknown = original?.headers?.[OWNED_COMPANY_HEADER];
    if (typeof sentOwned === 'string' && status === 403 && code === OWNED_COMPANY_GONE_CODE) {
      ownedCompany.endedByApi(sentOwned);
    }
    // Un módulo que la plataforma apagó: se vuelven a pedir los módulos de la empresa, así el menú y las rutas lo
    // esconden enseguida (sin esperar al próximo refresco).
    if (status === 403 && code === MODULE_DISABLED_CODE) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyModules.all });
    }
    if (status === 401) {
      // Con el token recién renovado, el 401 no es vencimiento (cuenta bloqueada, distribuidora inválida, rol): se muestra el motivo de la API.
      cerrarSesion(original?.reintentoConTokenNuevo ? toApiError(error).message : SESSION_EXPIRED_MESSAGE);
    } else if (code === 'auth/id-token-expired' || code === 'auth/argument-error') {
      cerrarSesion(SESSION_EXPIRED_MESSAGE);
    }
  }
  return Promise.reject(error);
};

http.interceptors.response.use(undefined, handleApiError);

/** Un listado paginado: la página pedida y el total sin paginar. */
export interface Page<T> {
  rows: T[];
  total: number;
}

/** Parámetros de paginación de la API (limit/offset). */
export interface PageParams {
  page: number;
  pageSize: number;
}

export const toQuery = ({ page, pageSize }: PageParams) => ({ limit: pageSize, offset: page * pageSize });

/**
 * Lee el total de la cabecera X-Total-Count (clientes, choferes). Sin la
 * cabecera, el total es lo que vino: nunca un número inventado.
 */
export const toPage = <T>(response: AxiosResponse<T[]>): Page<T> => {
  const header = response.headers['x-total-count'] as string | undefined;
  const total = header === undefined ? response.data.length : Number(header);
  return { rows: response.data, total: Number.isFinite(total) ? total : response.data.length };
};
