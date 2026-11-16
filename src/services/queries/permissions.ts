import { useQuery } from '@tanstack/react-query';
import { getMyPermissions } from '../api/permissions';
import { queryKeys } from './queryKeys';

/** Los permisos de la sesión. Cambian poco: se piden una vez por sesión (la clave lleva el email). */
export const useMyPermissions = (email: string | null) =>
  useQuery({
    queryKey: queryKeys.myPermissions.detail(email ?? ''),
    queryFn: getMyPermissions,
    enabled: !!email,
    staleTime: 5 * 60_000,
  });
