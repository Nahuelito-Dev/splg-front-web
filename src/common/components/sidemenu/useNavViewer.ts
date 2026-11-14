import { allows } from '../../../hooks/usePermiso';
import { useAppSelector } from '../../../hooks/reduxHooks';
import { usePermissions } from '../../../hooks/usePermissions';
import { useMyPermissions } from '../../../services/queries/permissions';
import type { NavViewer } from './navScope';

/**
 * Quién mira el menú: el modo del panel y, para el admin de empresa, sus permisos F37. Mientras no se saben (o si no
 * se pudieron leer) no se esconde nada: la API igual decide.
 */
export const useNavViewer = (): NavViewer => {
  const { mode } = usePermissions();
  const email = useAppSelector((state) => state.auth.email);
  const { data } = useMyPermissions(email);
  if (mode !== 'company' || !data) return { mode, permissions: mode === 'company' ? null : 'all' };
  return { mode, permissions: data.allPermissions ? 'all' : data.permissions.filter((code) => allows(data, code)) };
};
