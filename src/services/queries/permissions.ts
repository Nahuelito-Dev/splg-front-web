import { useQuery } from '@tanstack/react-query';
import { getMyPermissions, listPermissions } from '../api/permissions';
import { queryKeys } from './queryKeys';

/** Los permisos de la sesión. Cambian poco: se piden una vez por sesión (la clave lleva el email). */
export const useMyPermissions = (email: string | null) =>
  useQuery({
    queryKey: queryKeys.myPermissions.detail(email ?? ''),
    queryFn: getMyPermissions,
    enabled: !!email,
    staleTime: 5 * 60_000,
  });

/** El catálogo de permisos por módulo; `enabled` en falso no lo pide (p. ej. con el formulario cerrado). */
export const usePermissionCatalog = (enabled = true) =>
  useQuery({ queryKey: queryKeys.permissions.all, queryFn: listPermissions, staleTime: 5 * 60_000, enabled });
