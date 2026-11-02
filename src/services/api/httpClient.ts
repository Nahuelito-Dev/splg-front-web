import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import { store } from '../../store/store';
import { logOut } from '../../store/auth';
import { activeDistributor } from './activeDistributor';
import { getCurrentIdToken, logOutFirebase } from '../../firebase/providers';
import { esErrorDeSesion, SESSION_EXPIRED_MESSAGE } from '../../firebase/sessionErrors';
import { queryClient } from '../queries/queryClient';
import { toApiError } from './errors';

// Axios no trae estas opciones: las agregan `skipDistributor` y `public` (ver `attachAuthHeaders`).
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Marca interna: el pedido ya se reintentó con un token renovado tras un 401. */
    reintentoConTokenNuevo?: boolean;
    /**
     * Las llamadas de identidad (¿quién es este token?, antes de que haya sesión elegida)
     * no van con `X-Distributor`: si quedó un slug viejo en localStorage (de una
     * distribuidora ya borrada, o de una sesión anterior), la API la rechaza con 401 y
     * tira abajo el login entero. Ver `getAdmin`.
     */
    skipDistributor?: boolean;
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

/** Token y `X-Distributor` de cada pedido. Aparte para poder probarlo sin armar un axios entero. */
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
  // Un `X-Distributor` puesto a propósito en la llamada (administrador general) manda sobre el de «Ver como».
  if (!config.skipDistributor && !config.headers['X-Distributor']) {
    const distributor = activeDistributor.get();
    if (distributor) config.headers['X-Distributor'] = distributor;
  }
  return config;
};

http.interceptors.request.use(attachAuthHeaders);

interface BodyWithCode {
  code?: string;
}

http.interceptors.response.use(undefined, async (error: unknown) => {
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
    if (status === 401) {
      // Con el token recién renovado, el 401 no es vencimiento (cuenta bloqueada, distribuidora inválida, rol): se muestra el motivo de la API.
      cerrarSesion(original?.reintentoConTokenNuevo ? toApiError(error).message : SESSION_EXPIRED_MESSAGE);
    } else if (code === 'auth/id-token-expired' || code === 'auth/argument-error') {
      cerrarSesion(SESSION_EXPIRED_MESSAGE);
    }
  }
  return Promise.reject(error);
});

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
