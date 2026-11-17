import type { StaffRole } from '../../services/api/types';

/** Una acción de la fila: `null` si no se ofrece; si se ofrece pero no se puede, el porqué. */
export type RowAction = { blockedReason?: string } | null;

export interface StaffRoleViewer {
  /** La sesión tiene `roles.gestionar`. */
  canManage: boolean;
  /** Por qué no se puede escribir (modo soporte o administrador general sin empresa). */
  writeHint?: string;
  /** El rol del personal de quien mira (`GET /v2/me/permissions`). */
  ownRoleId: string | null;
}

export const SYSTEM_ROLE_EDIT_HINT = 'El rol de sistema no se edita';
export const SYSTEM_ROLE_DELETE_HINT = 'El rol de sistema no se da de baja';
export const OWN_ROLE_HINT = 'Es tu rol: nadie cambia sus propios permisos';
export const HAS_ADMINS_HINT = 'Tiene administradores: primero cambiales el rol';

/**
 * Qué puede hacer la sesión con un rol, con las reglas de la API: el de sistema no se edita ni se da de baja, nadie
 * edita el rol que tiene asignado y un rol con administradores no se da de baja. En modo soporte, todo en sólo lectura.
 */
export const staffRoleActions = (role: StaffRole, viewer: StaffRoleViewer): { edit: RowAction; remove: RowAction } => {
  if (!viewer.canManage) return { edit: null, remove: null };
  const blocked = (...reasons: (string | false | undefined)[]): RowAction => {
    const reason = reasons.find((r): r is string => Boolean(r));
    return reason ? { blockedReason: reason } : {};
  };
  return {
    edit: blocked(
      role.isSystem && SYSTEM_ROLE_EDIT_HINT,
      viewer.writeHint,
      role.staffRoleId === viewer.ownRoleId && OWN_ROLE_HINT,
    ),
    remove: blocked(role.isSystem && SYSTEM_ROLE_DELETE_HINT, viewer.writeHint, role.adminCount > 0 && HAS_ADMINS_HINT),
  };
};

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** La búsqueda del listado: por nombre o descripción, sin importar mayúsculas ni tildes. */
export const matchesStaffRole = (role: StaffRole, term: string): boolean => {
  const needle = fold(term.trim());
  return !needle || fold(`${role.name} ${role.description ?? ''}`).includes(needle);
};
