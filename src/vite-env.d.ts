/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_API_URL: string;
  readonly VITE_APP_SOCKET_URL?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** DSN del proyecto `splg-frontend` de Sentry. Sin él, Sentry no se inicializa. */
  readonly VITE_SENTRY_DSN?: string;
  /** Entorno en Sentry; si falta, el `mode` de Vite. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** `true` prende Session Replay (apagado por defecto: ver `observability/sentry.ts`). */
  readonly VITE_SENTRY_REPLAY?: string;
  /** Versión de `package.json`, la inyecta `vite.config.ts` en el build (el release de Sentry). */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Lo llama Google Maps cuando rechaza la clave (inválida, sin la API habilitada o sin permiso para el dominio). */
  gm_authFailure?: () => void;
}
