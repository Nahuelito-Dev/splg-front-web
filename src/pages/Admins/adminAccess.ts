import type { Admin } from '../../services/api/types';

export type ManageState = 'allowed' | 'needs-distributor' | 'hidden';

export interface Manageable {
  edit: ManageState;
  remove: ManageState;
}

interface Viewer {
  isSuperAdmin: boolean;
  /** El administrador general sin «Ver como»: la API pide empresa para operar sobre un admin de empresa. */
  needsDistributor: boolean;
  email: string | null;
}

const isSuperAdminRow = (admin: Admin): boolean => (admin.user?.role?.type ?? admin.role?.type) === 'super_admin';

/**
 * Qué puede hacer la sesión con la ficha de un administrador, con las reglas de la API:
 * - Nadie se da de baja a sí mismo; un admin de empresa tampoco se edita, el administrador general sí.
 * - Un admin de empresa no toca a un super admin.
 * - El administrador general necesita una empresa elegida para operar sobre un admin de empresa; un super admin no
 *   es de ninguna, así que con una empresa elegida la API no lo encuentra y sólo se lo gestiona sin ella.
 */
export const manageStateOf = (admin: Admin, viewer: Viewer): Manageable => {
  const own = Boolean(viewer.email) && admin.user?.email?.toLowerCase() === viewer.email?.toLowerCase();
  const target = isSuperAdminRow(admin);
  if (!viewer.isSuperAdmin) return own || target ? { edit: 'hidden', remove: 'hidden' } : both('allowed');
  const state: ManageState = target
    ? viewer.needsDistributor
      ? 'allowed'
      : 'hidden'
    : viewer.needsDistributor
      ? 'needs-distributor'
      : 'allowed';
  return { edit: state, remove: own ? 'hidden' : state };
};

const both = (state: ManageState): Manageable => ({ edit: state, remove: state });
