/**
 * Variables de entorno del panel, leídas y validadas una sola vez. Si falta la
 * URL de la API el panel no arranca: mejor un error claro al abrirlo que
 * llamadas a `undefined/customers`.
 */
const required = (name: keyof ImportMetaEnv): string => {
  // Vite tipa import.meta.env con un índice `any`: se valida como unknown.
  const value: unknown = import.meta.env[name];
  if (typeof value !== 'string' || !value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
};

const apiBase = required('VITE_APP_API_URL').replace(/\/+$/, '');

/** Versión de la API que consume el panel (ver «Versiones de la API» en el back). */
const API_VERSION = 'v1';

export const env = {
  /** Base de la API REST versionada: `VITE_APP_API_URL` (con /api) + /v1. */
  apiUrl: `${apiBase}/${API_VERSION}`,
  /** Base de la v2 de la API: los endpoints nuevos (exportes, …) sólo existen ahí. */
  apiUrlV2: `${apiBase}/v2`,
  /** Base de la v3: el código de entrega al revés (lo ve el cliente, lo tipea el chofer). */
  apiUrlV3: `${apiBase}/v3`,
  /** API GraphQL (sólo lectura, informes): no tiene versión en la ruta. */
  graphqlUrl: `${apiBase}/graphql`,
  /** Servidor de sockets; por defecto, la API sin el sufijo /api. */
  socketUrl: import.meta.env.VITE_APP_SOCKET_URL ?? apiBase.replace(/\/api$/, ''),
  /**
   * Clave de Google Maps del navegador (restringida por dominio en la consola de Google). Opcional: sin ella los mapas
   * muestran un aviso en su lugar. Se lee al usarla para que los tests puedan cambiarla con `vi.stubEnv`.
   */
  get googleMapsApiKey(): string {
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  },
} as const;
