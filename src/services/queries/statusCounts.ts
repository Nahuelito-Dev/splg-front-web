import { useQueries, type QueryKey } from '@tanstack/react-query';

/**
 * Cuántos registros hay en cada estado de un listado: una página mínima por estado, leyendo su total. Un estado sin
 * dato (cargando o con error) queda en `null`, nunca en 0. `keyOf` debe incluir los demás filtros del listado.
 */
export const useStatusCounts = <S extends string>(
  statuses: readonly S[],
  keyOf: (status: S | 'all') => QueryKey,
  totalOf: (status: S | undefined) => Promise<number>,
  enabled = true,
): Record<S | 'all', number | null> => {
  const all: (S | undefined)[] = [undefined, ...statuses];
  const results = useQueries({
    queries: all.map((status) => ({
      queryKey: keyOf(status ?? 'all'),
      queryFn: () => totalOf(status),
      enabled,
      staleTime: 30_000,
    })),
  });
  return Object.fromEntries(all.map((status, index) => [status ?? 'all', results[index].data ?? null])) as Record<
    S | 'all',
    number | null
  >;
};
