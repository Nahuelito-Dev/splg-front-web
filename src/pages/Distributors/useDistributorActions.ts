import type { Distributor } from '../../services/api/types';
import { useDeleteDistributor, useUpdateDistributor } from '../../services/queries/distributors';
import { confirm, notify } from '../../utils/notifications';

/**
 * Suspender/activar y dar de baja una empresa: la lista y la ficha comparten el mismo
 * comportamiento (confirmaciones).
 */
export const useDistributorActions = (callbacks: { onDeleted?: () => void } = {}) => {
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

    deleteDistributor.mutate(distributor.distributor_id, {
      onSuccess: () => {
        notify.success('Empresa dada de baja');
        callbacks.onDeleted?.();
      },
      onError: notify.error,
    });
  };

  return { toggleStatus, remove, busy: updateDistributor.isPending || deleteDistributor.isPending };
};
