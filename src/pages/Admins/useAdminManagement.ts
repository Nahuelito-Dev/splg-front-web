import { useCallback } from 'react';
import { OPERATE_HINT, useAppSelector, usePermissions } from '../../hooks';
import type { Admin } from '../../services/api/types';
import { useDeleteAdmin } from '../../services/queries/admins';
import { confirm, notify } from '../../utils/notifications';
import { manageStateOf, type Manageable } from './adminAccess';

/** Editar y dar de baja administradores: qué puede la sesión sobre cada uno y la baja con su confirmación. */
export const useAdminManagement = () => {
  const { isSuperAdmin, needsDistributor } = usePermissions();
  const email = useAppSelector((state) => state.auth.email);
  const { mutate: deleteAdmin } = useDeleteAdmin();

  const stateOf = useCallback(
    (admin: Admin): Manageable => manageStateOf(admin, { isSuperAdmin, needsDistributor, email }),
    [isSuperAdmin, needsDistributor, email],
  );

  const remove = useCallback(
    async (admin: Admin, onDone?: () => void) => {
      const name = admin.user?.full_name ?? 'el administrador';
      const ok = await confirm({
        title: '¿Dar de baja al administrador?',
        text: `${name} deja de poder entrar al panel: su cuenta se deshabilita. Sus datos y su historial se conservan.`,
        confirmText: 'Dar de baja',
        danger: true,
      });
      if (!ok) return;
      deleteAdmin(admin.admin_id, {
        onSuccess: () => {
          notify.success('Administrador dado de baja');
          onDone?.();
        },
        onError: notify.error,
      });
    },
    [deleteAdmin],
  );

  return { stateOf, remove, blockedReason: OPERATE_HINT };
};
