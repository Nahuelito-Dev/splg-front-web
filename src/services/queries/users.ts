import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  blockUser,
  deleteUser,
  getUser,
  getUserByEmail,
  getUserByPhone,
  listUsers,
  updateUserAccount,
  type UserRoleFilter,
} from '../api/users';
import type { PageParams } from '../api/httpClient';
import type { UpdateUserBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.users;

/**
 * Bloquear, editar o dar de baja una cuenta se ve también en Clientes y Choferes (sus listas, sus segmentos y sus
 * conteos), que salen de otros recursos: se refrescan todos.
 */
const invalidateAccountViews = (queryClient: QueryClient) =>
  Promise.all(
    [keys.all, queryKeys.customers.all, queryKeys.deliveries.all].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );

export const useUsers = (params: PageParams, search: string, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.list({ ...params, search }),
    queryFn: () => listUsers(params, search),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useUser = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getUser(id ?? ''),
    enabled: Boolean(id),
  });

/** Datos de la cuenta (nombre, teléfono, contraseña). Sólo el administrador general si es un cliente. */
export const useUpdateUserAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, changes }: { userId: string; changes: UpdateUserBody }) =>
      updateUserAccount(userId, changes),
    onSuccess: () => invalidateAccountViews(queryClient),
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) => blockUser(userId, block),
    onSuccess: () => invalidateAccountViews(queryClient),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => invalidateAccountViews(queryClient),
  });
};

/** Búsqueda puntual por teléfono (soporte: ubicar una cuenta sin saber el nombre). Resuelve `null` si nadie lo tiene. */
export const useFindUserByPhone = () => useMutation({ mutationFn: getUserByPhone });

/** La cuenta del admin logueado, para "Mi cuenta". */
export const useMyAccount = (email: string | null) =>
  useQuery({
    queryKey: [...keys.all, 'me', email],
    queryFn: () => getUserByEmail(email ?? ''),
    enabled: Boolean(email),
  });

/** Los grupos de la pantalla de Usuarios: todos, o uno por tipo de rol (`GET /users?role=`). */
export type UserRoleTab = 'all' | UserRoleFilter;

export const USER_ROLE_TABS: UserRoleTab[] = ['all', 'admin', 'super_admin', 'delivery', 'customer'];

const roleOf = (tab: UserRoleTab) => (tab === 'all' ? undefined : tab);

/** La lista de usuarios de un grupo. Cuelga de `queryKeys.users` para refrescarse con bloquear, editar y dar de baja. */
export const useUsersByRole = (tab: UserRoleTab, params: PageParams, search: string) =>
  useQuery({
    queryKey: keys.list({ ...params, search, tab }),
    queryFn: () => listUsers(params, search, roleOf(tab)),
    placeholderData: keepPreviousData,
  });

/**
 * Cuántos usuarios hay en cada grupo: el `total` real de la API con una página mínima por rol. Un grupo sin dato
 * (cargando o con error) queda en `null`, nunca en 0.
 */
export const useUserRoleCounts = () => {
  const ONE: PageParams = { page: 0, pageSize: 1 };
  const results = useQueries({
    queries: USER_ROLE_TABS.map((tab) => ({
      queryKey: keys.list({ counts: tab }),
      queryFn: () => listUsers(ONE, undefined, roleOf(tab)).then((page) => page.total),
      staleTime: 30_000,
    })),
  });
  return Object.fromEntries(USER_ROLE_TABS.map((tab, i) => [tab, results[i]?.data ?? null])) as Record<
    UserRoleTab,
    number | null
  >;
};
