import { useCallback } from 'react';
import { useCurrentDistributor } from '../services/queries/distributors';
import { usePermissions } from './usePermissions';

/**
 * Los eventos de admin del socket traen `distributorId`. El administrador general los recibe de todas las empresas:
 * si está en «Ver como X», se descartan los de otra. Un admin de empresa recibe sólo los suyos (el back lo acota por
 * sala), y el administrador general sin empresa elegida los ve todos.
 */
export const useDistributorEventFilter = () => {
  const { isSuperAdmin, needsDistributor } = usePermissions();
  const mustFilter = isSuperAdmin && !needsDistributor;
  const { data: current } = useCurrentDistributor(mustFilter);
  const viewingId = mustFilter ? current?.distributor_id : undefined;

  return useCallback(
    (payload: { distributorId?: string | null } | undefined): boolean => {
      if (!mustFilter) return true;
      if (!payload?.distributorId) return true;
      return Boolean(viewingId) && payload.distributorId === viewingId;
    },
    [mustFilter, viewingId],
  );
};
