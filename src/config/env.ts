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

const apiUrl = required('VITE_APP_API_URL').replace(/\/+$/, '');

export const env = {
  /** Base de la API REST, con el sufijo /api. */
  apiUrl,
  /** Servidor de sockets; por defecto, la API sin el sufijo /api. */
  socketUrl: import.meta.env.VITE_APP_SOCKET_URL ?? apiUrl.replace(/\/api$/, ''),
} as const;
