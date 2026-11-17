import * as Sentry from '@sentry/react';
import axios, { type AxiosError } from 'axios';
import { scrubUrl } from './scrub';

/** Ids en el path (uuid o numéricos) pasan a `:id`, así un mismo endpoint agrupa en un solo problema. */
const normalizePath = (url: string) =>
  scrubUrl(url)
    .replace(/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');

/** Un mismo endpoint con el mismo estado se manda como mucho una vez en este lapso (por pestaña). */
export const API_ERROR_THROTTLE_MS = 5 * 60_000;

/**
 * Un timeout de verdad: el pedido tenía `timeout` y venció. Axios usa `ECONNABORTED` también para un pedido abortado
 * (el panel no configura timeout), y eso no es una falla.
 */
const isRealTimeout = (error: AxiosError) =>
  error.code === 'ETIMEDOUT' || (error.code === 'ECONNABORTED' && (error.config?.timeout ?? 0) > 0);

/** El estado con el que se agrupa: el código HTTP, `timeout` o `network`; `null` si no se reporta. */
const kindOf = (error: unknown): string | null => {
  if (!axios.isAxiosError(error) || axios.isCancel(error) || error.code === 'ERR_CANCELED') return null;
  const status = error.response?.status;
  if (status !== undefined) return status >= 500 ? String(status) : null;
  if (isRealTimeout(error)) return 'timeout';
  if (error.code === 'ECONNABORTED') return null;
  return 'network';
};

/**
 * Qué falla de la API va a Sentry: sólo 5xx, red caída y timeouts reales. Un 4xx es una respuesta esperada
 * (validación, permisos, sesión) y lo resuelve la pantalla; una cancelación o un pedido abortado no es error.
 */
export const shouldReportApiError = (error: unknown): boolean => kindOf(error) !== null;

/**
 * Arma el reporte con su propio freno en memoria: con la red caída o la API en 5xx, cada pantalla reintenta y
 * mandaría decenas de eventos iguales. Aparte de la instancia de la app para probarlo con otro reloj.
 */
export const createApiErrorReporter = (now: () => number = Date.now) => {
  const lastSent = new Map<string, number>();
  return (error: unknown): void => {
    const kind = kindOf(error);
    if (kind === null || !axios.isAxiosError(error)) return;
    const method = (error.config?.method ?? 'get').toUpperCase();
    const path = normalizePath(error.config?.url ?? '');
    const key = `${method} ${path} ${kind}`;
    const previous = lastSent.get(key);
    if (previous !== undefined && now() - previous < API_ERROR_THROTTLE_MS) return;
    lastSent.set(key, now());
    const requestId: unknown = error.response?.headers?.['x-request-id'];
    Sentry.captureException(error, {
      tags: {
        'api.status': kind,
        'api.method': method,
        'api.path': path,
        ...(typeof requestId === 'string' && requestId ? { request_id: requestId } : {}),
      },
      fingerprint: ['api-error', method, path, kind],
    });
  };
};

/** Manda a Sentry la falla de la API con el `X-Request-Id` de la respuesta, para cruzarla con los logs del back. */
export const reportApiError = createApiErrorReporter();
