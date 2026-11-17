import type { MyPermissions } from '../services/api/types';
import { useMyPermissions } from '../services/queries/permissions';
import { useAppSelector } from './reduxHooks';

export interface Permiso {
  /** La sesión lo tiene. Mientras no se sabe, `false`. */
  allowed: boolean;
  /** Ya se sabe si lo tiene o no (respondió `GET /me/permissions`, bien o mal). */
  known: boolean;
}

/** Si esos permisos incluyen `code` (el super admin y el rol de sistema tienen todos). */
export const allows = (permissions: MyPermissions, code: string) =>
  permissions.allPermissions || permissions.permissions.includes(code);

/**
 * Si la sesión tiene un permiso del catálogo (`despacho.gestionar`, `pedidos.ver`…), con las mismas reglas que la
 * API: el super admin y el rol de sistema tienen todos. Si no se pudieron leer los permisos, no se esconde nada: la
 * API igual rechaza con 403 lo que no corresponde.
 */
export const usePermiso = (code: string): Permiso => {
  const email = useAppSelector((state) => state.auth.email);
  const { data, error } = useMyPermissions(email);
  if (data) return { allowed: allows(data, code), known: true };
  return { allowed: Boolean(error), known: Boolean(error) };
};

/**
 * El motivo de una acción apagada por falta de un permiso del rol del personal («Gestionar los clientes»). Mientras no
 * se sabe, nada: la API igual rechaza con 403 lo que no corresponde.
 */
export const missingPermisoHint = (permiso: Permiso, label: string): string | undefined =>
  permiso.known && !permiso.allowed ? `Hace falta el permiso «${label}»` : undefined;
