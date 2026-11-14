import { useAppSelector } from './reduxHooks';
import { SUPPORT_EXPORTS_HINT, SUPPORT_FILES_HINT, useSupportSession } from './useSupportSession';

/** Lo que se le dice al administrador general en una acción de empresa fuera del modo soporte. */
export const OPERATE_HINT = 'Para ver una empresa, entrá en modo soporte';

/** Por qué un control de edición está apagado mientras el administrador general mira una empresa. */
export const SUPPORT_READ_ONLY_HINT = 'Modo soporte: sólo lectura';

export { SUPPORT_EXPORTS_HINT, SUPPORT_FILES_HINT } from './useSupportSession';

/** Cómo está mirando el panel quien entró. */
export type PanelMode = 'platform' | 'support' | 'company';

/**
 * Lo que la sesión puede hacer según su rol, con las mismas reglas que la API.
 *
 * - Admin de empresa: opera su empresa.
 * - Administrador general **sin** sesión de soporte (`platform`): ve sólo lo de la plataforma; nada de una empresa.
 * - Administrador general **con** sesión de soporte activa (`support`): ve la empresa de la sesión como la vería su
 *   admin, en **sólo lectura** (la API rechaza toda escritura con 403 `SUPPORT_READ_ONLY`). `GET /v2/me/permissions`
 *   le sigue dando todos los permisos: el sólo lectura lo aplica el panel acá.
 */
export const usePermissions = () => {
  const role = useAppSelector((state) => state.auth.role);
  const { active } = useSupportSession();
  const isSuperAdminRole = role === 'super_admin';
  const inSupport = isSuperAdminRole && active !== null;
  const mode: PanelMode = !isSuperAdminRole ? 'company' : inSupport ? 'support' : 'platform';
  // En modo soporte se comporta como el admin de la empresa (sin atajos de plataforma).
  const isSuperAdmin = mode === 'platform';
  // El administrador general en la plataforma no tiene una empresa: lo de empresa no se pide.
  const needsDistributor = mode === 'platform';
  const readOnly = mode === 'support';
  const blockedHint = readOnly ? SUPPORT_READ_ONLY_HINT : needsDistributor ? OPERATE_HINT : undefined;
  // Leer archivos y exportar no escribe: en soporte se puede, pero sólo con el alcance (`files`, `exports`) aprobado.
  const scopeHint = (scope: 'files' | 'exports', hint: string) =>
    needsDistributor ? OPERATE_HINT : readOnly && !active?.scope.includes(scope) ? hint : undefined;
  const fileHint = scopeHint('files', SUPPORT_FILES_HINT);
  const exportHint = scopeHint('exports', SUPPORT_EXPORTS_HINT);
  return {
    mode,
    /** El administrador general en la plataforma (fuera del modo soporte). */
    isSuperAdmin,
    /** La cuenta es de un administrador general, esté o no en modo soporte. */
    isSuperAdminRole,
    inSupport,
    readOnly,
    needsDistributor,
    /** Crear o editar datos de una empresa. */
    canWrite: !blockedHint,
    /** Por qué un botón de alta o edición está deshabilitado (para su `title`). */
    writeHint: blockedHint,
    /** Tomar, resolver y reabrir reclamos e incidencias. */
    canOperate: !blockedHint,
    operateHint: blockedHint,
    /** Ver o bajar archivos subidos (adjuntos, documentos, fotos). */
    canSeeFiles: !fileHint,
    fileHint,
    /** Exportes (CSV/Excel) y PDF del back. */
    canExport: !exportHint,
    exportHint,
    canManageCustomerAccounts: isSuperAdmin,
    /** GET /audit exige rol admin o super_admin: los dos únicos que entran al panel. */
    canViewAudit: role === 'admin' || role === 'super_admin',
  };
};
