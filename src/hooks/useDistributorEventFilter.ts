import { useCallback } from 'react';
import { usePermissions } from './usePermissions';

/**
 * Los eventos de admin del socket traen `distributorId`. Un admin de empresa recibe sólo los suyos (el back lo acota
 * por sala). El administrador general hoy todavía los recibe de todas las empresas (la sala de plataforma llega con
 * E2): el panel descarta todos los de una empresa, porque en la plataforma no ve operación y en modo soporte no hay
 * tiempo real (D5). Los eventos sin empresa (de plataforma) pasan siempre.
 */
export const useDistributorEventFilter = () => {
  const { isSuperAdminRole } = usePermissions();
  return useCallback(
    (payload: { distributorId?: string | null } | undefined): boolean => !isSuperAdminRole || !payload?.distributorId,
    [isSuperAdminRole],
  );
};
