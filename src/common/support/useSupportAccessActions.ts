import type { SupportSession } from '../../services/api/types';
import { usePermiso } from '../../hooks/usePermiso';
import { useRevokeSupportAccess } from '../../services/queries/supportSessions';
import { confirm, notify } from '../../utils/notifications';

/**
 * Los permisos F37 que pide «Accesos de soporte» (`usePermiso` de develop: si no se pudieron leer, no se esconde
 * nada y la API decide). Los permisos se piden una vez por sesión.
 */
export const useSupportAccessPermissions = () => {
  const ver = usePermiso('soporte.ver');
  const gestionar = usePermiso('soporte.gestionar');
  return { canView: ver.allowed, canManage: gestionar.allowed, isPending: !ver.known };
};

/** Confirma y revoca una sesión activa: vale desde la consulta siguiente del soporte. */
export const useRevokeWithConfirm = () => {
  const revoke = useRevokeSupportAccess();
  const run = async (session: SupportSession) => {
    const confirmed = await confirm({
      title: '¿Revocar el acceso de soporte?',
      text: `El soporte deja de ver ${session.distributorName} en su próxima consulta. Si lo necesita de nuevo, tiene que pedir otro acceso.`,
      confirmText: 'Revocar',
      danger: true,
    });
    if (!confirmed) return;
    revoke.mutate(session.id, {
      onSuccess: () => notify.success('Acceso de soporte revocado'),
      onError: notify.error,
    });
  };
  return { run, isPending: revoke.isPending };
};
