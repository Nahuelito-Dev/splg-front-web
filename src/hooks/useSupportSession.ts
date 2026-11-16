import { useSyncExternalStore } from 'react';
import { supportMode, type SupportModeState } from '../services/api/supportMode';
import type { SupportScope } from '../services/api/supportSessions';

/** El modo soporte del administrador general: si la API ya respondió, y la sesión activa o el pedido pendiente. */
export const useSupportSession = () => {
  const { loaded, session }: SupportModeState = useSyncExternalStore(supportMode.subscribe, supportMode.getState);
  return {
    loaded,
    session,
    /** La sesión activa (la que viaja en `X-Support-Session`), o `null`. */
    active: session?.status === 'active' ? session : null,
    /** El pedido esperando la aprobación de la empresa, o `null`. */
    pending: session?.status === 'pending' ? session : null,
  };
};

export const SUPPORT_FILES_HINT = 'Este acceso de soporte no incluye archivos: pedí otro con ese alcance';
export const SUPPORT_EXPORTS_HINT = 'Este acceso de soporte no incluye exportes ni PDF: pedí otro con ese alcance';

/**
 * En modo soporte, ver archivos y bajar exportes o PDF necesita el alcance aprobado (`files`, `exports`): si no, la
 * API responde 403 `SUPPORT_SCOPE_REQUIRED`. Devuelve el motivo para apagar el control, o `undefined`. Sólo mira la
 * sesión de soporte (no la cuenta): la tiene únicamente el administrador general.
 */
export const useSupportScopeHint = (scope: Extract<SupportScope, 'files' | 'exports'>): string | undefined => {
  const { active } = useSupportSession();
  if (!active || active.scope.includes(scope)) return undefined;
  return scope === 'files' ? SUPPORT_FILES_HINT : SUPPORT_EXPORTS_HINT;
};
