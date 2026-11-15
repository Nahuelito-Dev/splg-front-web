import { allows } from '../../../hooks/usePermiso';
import { useAppSelector } from '../../../hooks/reduxHooks';
import { usePermissions } from '../../../hooks/usePermissions';
import { useModuleAvailability } from '../../../services/queries/modules';
import { useMyPermissions } from '../../../services/queries/permissions';
import type { NavViewer } from './navScope';

/**
 * Quién mira el menú: el modo del panel y, para el admin de empresa (o la empresa propia), sus permisos F37. Mientras no se saben (o si no
 * se pudieron leer) no se esconde nada: la API igual decide.
 */
export const useNavViewer = (): NavViewer => {
  const { mode } = usePermissions();
  const email = useAppSelector((state) => state.auth.email);
  const { data } = useMyPermissions(email);
  // Los módulos de la empresa que se mira (admin, soporte o propia); en la plataforma no se piden.
  const { enabledByKey: modules } = useModuleAvailability();
  // La empresa propia se lee como la de un admin: sus permisos son los de `GET /v2/me/permissions` con el encabezado.
  const asCompany = mode === 'company' || mode === 'owned';
  if (!asCompany || !data) return { mode, permissions: asCompany ? null : 'all', modules };
  return {
    mode,
    permissions: data.allPermissions ? 'all' : data.permissions.filter((code) => allows(data, code)),
    modules,
  };
};
