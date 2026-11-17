import * as Sentry from '@sentry/react';

export interface SentryScope {
  /** Id interno del usuario (`user_id` de la API); `null` sin sesión. */
  userId: string | null;
  role: string | null;
  /** `company`, `support`, `owned` o `platform` (ver `usePermissions`). */
  mode: string | null;
  /** Id de la empresa que se está mirando (`distributor_id`); `null` en la plataforma o mientras carga. */
  distributorId: string | null;
}

/**
 * Deja en el scope de Sentry quién está usando el panel y sobre qué empresa: sólo el id interno (ni correo ni nombre),
 * el rol y la empresa. Sin sesión se limpia todo, así un error en el login no queda a nombre de la cuenta anterior.
 */
export const applySentryScope = ({ userId, role, mode, distributorId }: SentryScope) => {
  if (!userId) {
    Sentry.setUser(null);
    Sentry.setTags({ role: undefined, panel_mode: undefined, distributor: undefined });
    return;
  }
  Sentry.setUser({ id: userId });
  Sentry.setTags({
    role: role ?? undefined,
    panel_mode: mode ?? undefined,
    // El id, para cruzarlo con los logs y la base del back; en la plataforma no hay empresa.
    distributor: mode === 'platform' ? 'platform' : (distributorId ?? undefined),
  });
};
