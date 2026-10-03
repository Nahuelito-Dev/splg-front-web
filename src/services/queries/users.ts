import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { listAdmins } from '../api/admins';
import { listCustomers } from '../api/customers';
import { listDeliveries } from '../api/deliveries';
import {
  blockUser,
  deleteUser,
  getUser,
  getUserByEmail,
  getUserByPhone,
  listUsers,
  updateUserAccount,
} from '../api/users';
import type { Page, PageParams } from '../api/httpClient';
import type { UpdateUserBody, User } from '../api/types';
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

/** Los grupos de la pantalla de Usuarios: todos, o los de cada rol (cada uno sale de su endpoint). */
export type UserRoleTab = 'all' | 'customer' | 'delivery' | 'admin';

const matches = (user: User, term: string) => {
  const needle = term.trim().toLowerCase();
  return (
    !needle || [user.full_name, user.email, user.phone_number].some((f) => (f ?? '').toLowerCase().includes(needle))
  );
};

const listUsersByRole = async (tab: UserRoleTab, params: PageParams, search: string): Promise<Page<User>> => {
  if (tab === 'customer') {
    const page = await listCustomers(params, search);
    const rows = page.rows.flatMap((customer) => (customer.user ? [{ ...customer.user, customer }] : []));
    // Un perfil sin cuenta (dado de baja) no es un usuario: no se muestra ni se cuenta.
    return { total: page.total - (page.rows.length - rows.length), rows };
  }
  if (tab === 'delivery') {
    const page = await listDeliveries(params, search);
    const rows = page.rows.flatMap((delivery) => (delivery.user ? [{ ...delivery.user, delivery }] : []));
    return { total: page.total - (page.rows.length - rows.length), rows };
  }
  if (tab === 'admin') {
    // GET /admin no pagina ni busca: se filtra y se corta acá.
    const users = (await listAdmins())
      .flatMap((admin) => (admin.user ? [admin.user] : []))
      .filter((u) => matches(u, search));
    return {
      total: users.length,
      rows: users.slice(params.page * params.pageSize, (params.page + 1) * params.pageSize),
    };
  }
  return listUsers(params, search);
};

/** La lista de usuarios de un grupo. Cuelga de `queryKeys.users` para refrescarse con bloquear, editar y dar de baja. */
export const useUsersByRole = (tab: UserRoleTab, params: PageParams, search: string) =>
  useQuery({
    queryKey: keys.list({ ...params, search, tab }),
    queryFn: () => listUsersByRole(tab, params, search),
    placeholderData: keepPreviousData,
  });

/**
 * Cuántos usuarios hay en cada grupo: el total de cada endpoint (`X-Total-Count` con una página mínima, o el largo
 * de /admin). Un grupo sin dato (cargando o con error) queda en `null`, nunca en 0.
 */
export const useUserRoleCounts = () => {
  const ONE: PageParams = { page: 0, pageSize: 1 };
  const results = useQueries({
    queries: [
      { queryKey: keys.list({ counts: 'all' }), queryFn: () => listUsers(ONE).then((p) => p.total) },
      { queryKey: keys.list({ counts: 'customer' }), queryFn: () => listCustomers(ONE).then((p) => p.total) },
      { queryKey: keys.list({ counts: 'delivery' }), queryFn: () => listDeliveries(ONE).then((p) => p.total) },
      { queryKey: keys.list({ counts: 'admin' }), queryFn: () => listAdmins().then((admins) => admins.length) },
    ].map((query) => ({ ...query, staleTime: 30_000 })),
  });
  const [all, customer, delivery, admin] = results.map((result) => result.data ?? null);
  return { all, customer, delivery, admin } satisfies Record<UserRoleTab, number | null>;
};
