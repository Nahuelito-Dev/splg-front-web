import type { PanelMode } from '../../../hooks/usePermissions';
import type { NavItem } from './navConfig';

export interface NavViewer {
  mode: PanelMode;
  /** Permisos F37 del admin de la empresa; `'all'` si los tiene todos; `null` mientras no se saben (no se esconde nada). */
  permissions: string[] | 'all' | null;
}

/**
 * Quién ve cada pantalla del menú (y del buscador):
 * - Administrador general en la plataforma: sólo las de plataforma y las «ambos».
 * - Administrador general en modo soporte: las de empresa y las «ambos» (en sólo lectura), no las de plataforma.
 * - Admin de empresa: las de empresa y las «ambos», con su permiso cuando la pantalla lo pide.
 */
export const isNavItemVisible = (item: NavItem, viewer: NavViewer): boolean => {
  const scope = item.scope ?? 'company';
  if (viewer.mode === 'platform') return scope !== 'company';
  if (scope === 'platform') return false;
  if (viewer.mode === 'support') return !item.companyAdminOnly;
  // Mientras no se saben los permisos no se esconde nada: la API igual responde 403 si no corresponde.
  if (!item.permission || viewer.permissions === 'all' || viewer.permissions === null) return true;
  return viewer.permissions.includes(item.permission);
};
