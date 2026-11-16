import { useQueries } from '@tanstack/react-query';
import { getUser } from '../api/users';
import { queryKeys } from './queryKeys';

const keys = queryKeys.users;
const FIVE_MINUTES = 5 * 60_000;

export interface UserNames {
  /** El nombre de la cuenta, o `null` si todavía no llegó o la API no la devolvió (otra distribuidora, baja). */
  nameOf: (userId: string | null | undefined) => string | null;
  /** Todavía se está pidiendo alguna cuenta. */
  loading: boolean;
}

/**
 * Resuelve nombres de usuario a partir de ids. La API no tiene una consulta por lote
 * (`GET /users` no filtra por ids), así que se pide `GET /users/:id` una sola vez por id
 * distinto, con la misma clave que `useUser`: el caché los comparte y una lista con
 * cien filas del mismo actor hace una sola llamada.
 */
export const useUserNames = (ids: ReadonlyArray<string | null | undefined>): UserNames => {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))].sort();
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: keys.detail(id),
      queryFn: () => getUser(id),
      staleTime: FIVE_MINUTES,
      retry: false,
    })),
  });
  const names = new Map<string, string | null>();
  unique.forEach((id, index) => names.set(id, results[index]?.data?.full_name ?? null));
  return {
    nameOf: (userId) => (userId ? (names.get(userId) ?? null) : null),
    loading: results.some((result) => result.isPending),
  };
};
