import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
  type createBrowserRouter,
} from 'react-router-dom';
import { replayEventScrubIntegration } from './replay';
import { scrubBreadcrumb, scrubErrorEvent, scrubTransactionEvent } from './scrub';

/** Lo que el init necesita del entorno. Aparte de `import.meta.env` para poder probarlo. */
export interface SentryEnv {
  /** `VITE_SENTRY_DSN`. Sin DSN no se inicializa nada. */
  dsn?: string;
  /** `VITE_SENTRY_ENVIRONMENT`; si falta, el `mode` de Vite. */
  environment?: string;
  mode: string;
  production: boolean;
  /** `VITE_APP_API_URL` (con `/api`): la única URL a la que se propagan las trazas. */
  apiUrl: string;
  /** La versión de `package.json`, inyectada en el build. */
  version?: string;
  /** Origen del panel (`location.origin`): sus recursos son los únicos, con los de la API, que quedan en Replay. */
  pageOrigin: string;
  /**
   * `VITE_SENTRY_REPLAY=true`. Session Replay está **apagado por defecto**: el evento `Meta` de la grabación (rrweb)
   * lleva `location.href` completo, con la query, y no pasa por `beforeAddRecordingEvent`. Sin forma de filtrarlo, una
   * búsqueda por DNI o teléfono en la URL quedaría grabada.
   */
  replay: boolean;
}

export const readSentryEnv = (): SentryEnv => ({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  mode: import.meta.env.MODE,
  production: import.meta.env.PROD,
  apiUrl: import.meta.env.VITE_APP_API_URL ?? '',
  version: import.meta.env.VITE_APP_VERSION,
  pageOrigin: window.location.origin,
  replay: import.meta.env.VITE_SENTRY_REPLAY === 'true',
});

export const releaseOf = (version: string | undefined) => `splg-frontend@${version ?? 'dev'}`;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * La API propia y nada más: `sentry-trace` y `baggage` no pueden salir hacia Google, Firebase ni Mercado Pago. Anclada
 * al principio y a un límite de segmento, así `https://api.x/api` no deja pasar `https://api.x/apiotra` ni una URL
 * ajena que la lleve en la query.
 */
export const apiTraceTarget = (apiUrl: string): RegExp | null => {
  const base = apiUrl.trim().replace(/\/+$/, '');
  return base ? new RegExp(`^${escapeRegExp(base)}(?:[/?#]|$)`) : null;
};

/** Las opciones de `Sentry.init`, o `null` si no hay DSN. */
export const buildSentryOptions = (env: SentryEnv): Sentry.BrowserOptions | null => {
  const dsn = env.dsn?.trim();
  if (!dsn) return null;
  const target = apiTraceTarget(env.apiUrl);
  return {
    dsn,
    environment: env.environment?.trim() || env.mode,
    release: releaseOf(env.version),
    // `sendDefaultPii: false` de v10: en v11 es `dataCollection`. Nada de usuario inferido, cookies, encabezados,
    // cuerpos ni query (el usuario lo pone `setUser` con el id interno y nada más).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Replay se suma aparte y sólo con `VITE_SENTRY_REPLAY=true` (ver `loadReplay`).
      replayEventScrubIntegration(),
    ],
    tracesSampleRate: env.production ? 0.1 : 1.0,
    tracePropagationTargets: target ? [target] : [],
    ...(env.replay ? { replaysSessionSampleRate: 0, replaysOnErrorSampleRate: env.production ? 0.5 : 1.0 } : {}),
    beforeSend: (event) => scrubErrorEvent(event),
    beforeSendTransaction: (event) => scrubTransactionEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  };
};

/**
 * Suma Session Replay con todos sus filtros. Import dinámico: con Replay apagado, su código (y el de rrweb) no se
 * descarga. Sólo se llama con `VITE_SENTRY_REPLAY=true`.
 */
export const loadReplay = async (env: SentryEnv): Promise<void> => {
  const { addReplayIntegration } = await import('./sentryReplay');
  addReplayIntegration(env.apiUrl, env.pageOrigin);
};

/** Inicializa Sentry si hay DSN. Devuelve si quedó activo. */
export const initSentry = (env: SentryEnv = readSentryEnv()): boolean => {
  const options = buildSentryOptions(env);
  if (!options) return false;
  Sentry.init(options);
  if (env.replay)
    void loadReplay(env).catch((error: unknown) => console.warn('No se pudo cargar Session Replay', error));
  return true;
};

/** `createBrowserRouter` instrumentado: nombra las transacciones con la ruta. Sin Sentry, es el de siempre. */
export const wrapBrowserRouter = (create: typeof createBrowserRouter): typeof createBrowserRouter =>
  Sentry.wrapCreateBrowserRouter(create);
