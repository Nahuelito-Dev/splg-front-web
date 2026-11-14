import { queryClient } from '../queries/queryClient';
import { notify } from '../../utils/notifications';
import type { SupportSession } from './types';

/** El encabezado con el que el administrador general mira una empresa en modo soporte. */
export const SUPPORT_SESSION_HEADER = 'X-Support-Session';

/**
 * Lo que responde la API cuando la sesión del encabezado ya no sirve: terminada (revocada, vencida, finalizada o
 * todavía pendiente) o inexistente. En los dos casos el panel sale del modo.
 */
export const SUPPORT_SESSION_GONE_CODES: ReadonlySet<string> = new Set([
  'SUPPORT_SESSION_ENDED',
  'SUPPORT_SESSION_NOT_FOUND',
]);

export const SUPPORT_ENDED_MESSAGE =
  'La sesión de soporte terminó (la empresa la revocó o venció). Volviste a la vista de plataforma.';

export interface SupportModeState {
  /** Ya se preguntó a la API (`GET /v2/support-sessions/current`) al menos una vez. */
  loaded: boolean;
  /** La sesión activa o el pedido pendiente del administrador general; `null` si no hay. */
  session: SupportSession | null;
}

const INITIAL: SupportModeState = { loaded: false, session: null };
let state: SupportModeState = INITIAL;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const activeIdOf = (session: SupportSession | null): string | null =>
  session?.status === 'active' ? session.id : null;

/**
 * El modo soporte del administrador general. La fuente de verdad es la API: el panel la consulta al iniciar y cada
 * 30 s (`useSupportModeSync`) y la corrige cuando una consulta responde que la sesión terminó (httpClient).
 *
 * Al entrar o salir de una sesión activa se vacía la caché de React Query: los datos de plataforma y los de la
 * empresa no se mezclan nunca.
 */
export const supportMode = {
  getState: (): SupportModeState => state,

  /** El id de la sesión activa (la que viaja en `X-Support-Session`), o `null`. */
  activeId: (): string | null => activeIdOf(state.session),

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Toma la sesión que informó la API. `endedMessage`: si con esto se termina una sesión activa que el usuario no
   * cerró, el aviso que se le muestra.
   */
  update: (session: SupportSession | null, endedMessage?: string) => {
    const wasLoaded = state.loaded;
    const before = activeIdOf(state.session);
    const after = activeIdOf(session);
    state = { loaded: true, session };
    if (before !== after) queryClient.clear();
    if (before && !after && endedMessage) notify.warn(endedMessage);
    // Al recargar la página con una sesión ya activa no se avisa de nuevo: sólo cuando se abre mientras se mira.
    if (wasLoaded && !before && session && after) {
      notify.info(`Modo soporte en ${session.distributorName}: sólo lectura`);
    }
    emit();
  },

  /** La API respondió que la sesión del encabezado terminó o no existe: se sale solo, con aviso. */
  endedByApi: (sessionId: string) => {
    if (activeIdOf(state.session) !== sessionId) return;
    supportMode.update(null, SUPPORT_ENDED_MESSAGE);
  },

  /** Al cerrar la sesión del panel: vuelve a «no se sabe» sin avisos. */
  reset: () => {
    state = INITIAL;
    emit();
  },
};
