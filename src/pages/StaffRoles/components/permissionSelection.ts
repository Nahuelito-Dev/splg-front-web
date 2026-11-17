import type { PermissionModule } from '../../../services/api/types';

export interface PermissionRules {
  /** Los que ya vienen con otro elegido (`gestionar` incluye `ver`), con el nombre del que los trae. */
  impliedBy: Map<string, string>;
  /** Si la sesión puede darlo: nadie da un permiso que no tiene (la API responde 403). */
  held: (key: string) => boolean;
}

const permissionsOf = (catalog: PermissionModule[]) => catalog.flatMap((module) => module.permissions);

/** Saca los que ya vienen con otro de la lista (`implies`). */
export const withoutImplied = (keys: string[], catalog: PermissionModule[]): string[] => {
  const implied = new Set(
    permissionsOf(catalog)
      .filter((permission) => keys.includes(permission.key))
      .flatMap((permission) => permission.implies),
  );
  return keys.filter((key) => !implied.has(key));
};

/**
 * Tildar o destildar permisos. Lo incluido en otro elegido no se manda aparte. Al destildar uno solo (`keepImplied`), lo
 * que traía y la sesión puede dar queda tildado: sacar «gestionar» deja «ver» (bajar a sólo lectura).
 */
export const togglePermissions = (
  current: string[],
  keys: string[],
  checked: boolean,
  catalog: PermissionModule[],
  keepImplied?: (key: string) => boolean,
): string[] => {
  if (checked) return withoutImplied([...new Set([...current, ...keys])], catalog);
  const rest = current.filter((key) => !keys.includes(key));
  if (!keepImplied) return rest;
  const kept = permissionsOf(catalog)
    .filter((permission) => keys.includes(permission.key))
    .flatMap((permission) => permission.implies)
    .filter((key) => !keys.includes(key) && keepImplied(key));
  return withoutImplied([...new Set([...rest, ...kept])], catalog);
};

/** Los permisos del módulo que la sesión puede dar: los únicos que mueve «Todos los permisos del módulo». */
export const grantableOf = (module: PermissionModule, rules: PermissionRules): string[] =>
  module.permissions.filter((permission) => rules.held(permission.key)).map((permission) => permission.key);

/** «Todos los permisos del módulo» está tildado si lo están todos los que la sesión puede dar (los demás no cuentan). */
export const allGrantableOn = (module: PermissionModule, values: string[], rules: PermissionRules): boolean => {
  const grantable = grantableOf(module, rules);
  return grantable.length > 0 && grantable.every((key) => values.includes(key) || rules.impliedBy.has(key));
};

/** El catálogo trae los nombres en minúscula («ver los pedidos»): en la casilla van con mayúscula inicial. */
export const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
