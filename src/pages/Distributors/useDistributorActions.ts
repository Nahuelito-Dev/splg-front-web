import type { Distributor } from '../../services/api/types';
import { activeDistributor } from '../../services/api/activeDistributor';
import { useDeleteDistributor, useUpdateDistributor } from '../../services/queries/distributors';
import { confirm, notify } from '../../utils/notifications';

/**
 * Suspender/activar y dar de baja una empresa: la lista y la ficha comparten el mismo
 * comportamiento (confirmaciones y el cuidado con el header `X-Distributor`).
 */
export const useDistributorActions = (callbacks: { onViewingChanged?: () => void; onDeleted?: () => void } = {}) => {
  const updateDistributor = useUpdateDistributor();
  const deleteDistributor = useDeleteDistributor();

  const toggleStatus = async (distributor: Distributor) => {
    const suspending = distributor.status === 'active';
    if (suspending) {
      const confirmed = await confirm({
        title: '¿Suspender la empresa?',
        text: `"${distributor.name}" no va a poder operar hasta reactivarla.`,
        confirmText: 'Suspender',
        danger: true,
      });
      if (!confirmed) return;
    }
    updateDistributor.mutate(
      { id: distributor.distributor_id, changes: { status: suspending ? 'suspended' : 'active' } },
      {
        onSuccess: () => notify.success(suspending ? 'Empresa suspendida' : 'Empresa activada'),
        onError: notify.error,
      },
    );
  };

  const remove = async (distributor: Distributor) => {
    const confirmed = await confirm({
      title: `¿Dar de baja "${distributor.name}"?`,
      text:
        'Es una baja lógica: sus choferes, administradores, clientes y pedidos quedan intactos en la base, ' +
        'pero la empresa deja de listarse y de poder resolverse (nuevos pedidos de sus clientes van a fallar). ' +
        'No hay forma de deshacerlo desde el panel.',
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;

    // Si es la que se está "viendo como", el header X-Distributor se saca ANTES
    // de borrar (no después del éxito): la invalidación de la lista dispara un
    // refetch de inmediato, y si todavía manda ese header la API ya no puede
    // resolverlo → 401 → la sesión se cierra sola antes de poder avisar nada.
    // DELETE /distributor/:id no necesita el header (es una acción de
    // plataforma), así que sacarlo antes no afecta el borrado en sí.
    const wasViewingThis = activeDistributor.get() === distributor.slug;
    if (wasViewingThis) activeDistributor.set(null);

    deleteDistributor.mutate(distributor.distributor_id, {
      onSuccess: () => {
        notify.success('Empresa dada de baja');
        if (wasViewingThis) {
          // Mismo criterio que "Ver todas": recarga para que todo el panel
          // (permisos, tenant en memoria) arranque limpio sin esa empresa.
          callbacks.onViewingChanged?.();
          callbacks.onDeleted?.();
          window.location.reload();
          return;
        }
        callbacks.onDeleted?.();
      },
      onError: (err) => {
        if (wasViewingThis) activeDistributor.set(distributor.slug);
        notify.error(err);
      },
    });
  };

  return { toggleStatus, remove, busy: updateDistributor.isPending || deleteDistributor.isPending };
};
