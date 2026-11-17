import { allows } from '../../hooks';
import type { Admin, MyPermissions, StaffRole } from '../../services/api/types';

export const NOT_HELD_ROLE_HINT = 'Tiene permisos que vos no tenés';
export const TARGET_OUTRANKS_HINT = 'No podés cambiarle el rol: tiene permisos que vos no tenés';
export const TARGET_IS_SYSTEM_HINT =
  'No podés cambiarle el rol: tiene el rol de sistema y vos no tenés todos los permisos';

/** Nadie da lo que no tiene: el rol de sistema pide tenerlos todos; los demás, cada uno de sus permisos. */
export const canGrant = (role: Pick<StaffRole, 'isSystem' | 'permissions'>, mine: MyPermissions | undefined) =>
  !mine || (role.isSystem ? mine.allPermissions : role.permissions.every((key) => allows(mine, key)));

/**
 * Nadie le cambia el rol a quien tiene más permisos (la API responde 403 `STAFF_ROLE_TARGET_OUTRANKS`): el rol que la
 * persona tiene hoy tiene que estar entero en los de la sesión, y el de sistema pide tenerlos todos. Los permisos del
 * rol actual salen de la lista de roles; mientras no se sabe, no se apaga nada (la API igual lo controla).
 */
export const targetOutranksReason = (
  admin: Admin,
  roles: StaffRole[] | undefined,
  mine: MyPermissions | undefined,
): string | undefined => {
  const current = admin.staffRole;
  if (!current || !mine || mine.allPermissions) return undefined;
  if (current.isSystem) return TARGET_IS_SYSTEM_HINT;
  const full = roles?.find((role) => role.staffRoleId === current.staffRoleId);
  return full && !canGrant(full, mine) ? TARGET_OUTRANKS_HINT : undefined;
};
