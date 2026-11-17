import { useEffect } from 'react';
import { useAppSelector, usePermissions } from '../hooks';
import { useCurrentDistributor } from '../services/queries/distributors';
import { applySentryScope } from './scope';

/**
 * Sincroniza el usuario y la empresa activa con Sentry donde se resuelve la sesión (montado una vez en `App`). La
 * empresa sale de la misma consulta que usa la tarjeta del menú (`/distributor/current`): no suma pedidos.
 */
export const SentryScopeSync = () => {
  const status = useAppSelector((state) => state.auth.status);
  const userId = useAppSelector((state) => state.auth.userId);
  const role = useAppSelector((state) => state.auth.role);
  const { mode } = usePermissions();
  const authenticated = status === 'authenticated';
  const { data: distributor } = useCurrentDistributor(authenticated && mode !== 'platform');
  const distributorId = distributor?.distributor_id ?? null;

  useEffect(() => {
    applySentryScope({
      userId: authenticated ? userId : null,
      role,
      mode,
      distributorId,
    });
  }, [authenticated, userId, role, mode, distributorId]);

  return null;
};
