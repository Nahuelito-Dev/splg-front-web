import axios, { type AxiosResponse } from 'axios';
import { env } from '../../config/env';
import { store } from '../../store/store';
import { logOut } from '../../store/auth';
import { startLogOut } from '../../store/auth/thunks';
import { activeDistributor } from './activeDistributor';

/** Origen que la API espera del panel: el guard lo compara con el rol del token. */
const CLIENT_SOURCE = 'panel-app';

/** Cliente HTTP autenticado del panel. Todas las llamadas a la API pasan por acá. */
export const http = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json', 'X-Client-Source': CLIENT_SOURCE },
});

const clearLocalSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('expireTimestamp');
};

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (!token) return Promise.reject(new Error('No hay sesión iniciada'));
  config.headers.Authorization = `Bearer ${token}`;
  const distributor = activeDistributor.get();
  if (distributor) config.headers['X-Distributor'] = distributor;
  return config;
});

interface BodyWithCode {
  code?: string;
}

http.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const code = (error.response?.data as BodyWithCode | undefined)?.code;
    if (status === 401) {
      clearLocalSession();
      store.dispatch(logOut({}));
    } else if (code === 'auth/id-token-expired' || code === 'auth/argument-error') {
      clearLocalSession();
      void store.dispatch(startLogOut());
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
