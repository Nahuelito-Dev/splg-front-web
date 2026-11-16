import type { PanelMode } from '../../../hooks/usePermissions';
import type { NavItem } from './navConfig';

export interface NavViewer {
  mode: PanelMode;
  /** Permisos F37 del admin de la empresa; `'all'` si los tiene todos; `null` mientras no se saben (no se esconde nada). */
  permissions: string[] | 'all' | null;
  /**
   * Módulos que la plataforma le habilitó a la empresa que se mira, por clave (`GET /v2/company/modules`). `null`
   * mientras no se saben o en la plataforma: no se esconde nada por módulo.
   */
  modules?: Readonly<Record<string, boolean>> | null;
}

/**
 * Quién ve cada pantalla del menú (y del buscador):
 * - Administrador general en la plataforma: sólo las de plataforma y las «ambos».
 * - Administrador general en modo soporte: las de empresa y las «ambos» (en sólo lectura), no las de plataforma.
 * - Admin de empresa: las de empresa y las «ambos», con su permiso cuando la pantalla lo pide.
 * - En la empresa (admin, soporte o propia), las de un módulo sólo si la plataforma se lo habilitó.
 */
export const isNavItemVisible = (item: NavItem, viewer: NavViewer): boolean => {
  const scope = item.scope ?? 'company';
  if (viewer.mode === 'platform') return scope !== 'company';
  if (scope === 'platform') return false;
  // Un módulo que la plataforma no le habilitó a la empresa no aparece (tampoco en soporte: la API respondería 403).
  if (item.module && viewer.modules?.[item.module] === false) return false;
  if (viewer.mode === 'support') return !item.companyAdminOnly;
  // Mientras no se saben los permisos no se esconde nada: la API igual responde 403 si no corresponde.
  if (viewer.permissions === 'all' || viewer.permissions === null) return true;
  const granted = viewer.permissions;
  if (item.anyPermission && !item.anyPermission.some((code) => granted.includes(code))) return false;
  return !item.permission || granted.includes(item.permission);
};
