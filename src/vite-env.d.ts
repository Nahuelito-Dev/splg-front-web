/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_API_URL: string;
  readonly VITE_APP_SOCKET_URL?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Lo llama Google Maps cuando rechaza la clave (inválida, sin la API habilitada o sin permiso para el dominio). */
  gm_authFailure?: () => void;
}
