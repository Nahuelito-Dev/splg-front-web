import { useEffect, useState } from 'react';
import { useDebounce } from '../../hooks';
import type { Order } from '../../services/api/types';
import { useAvailableOrders } from '../../services/queries/orders';

/** La API de pedidos acepta hasta 50 por página; se pagina de a menos para que la lista entre en el panel. */
export const POOL_PAGE_SIZE = 20;

/** Lo que la vista del pool necesita saber de su consulta. */
export interface AvailablePool {
  search: string;
  setSearch: (value: string) => void;
  page: number;
  setPage: (page: number) => void;
  orders: Order[];
  total: number;
  /** Sin ningún dato todavía (primera carga). */
  isLoading: boolean;
  /** Falló y no hay datos que mostrar. */
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * CU-080: el pool de pedidos sin chofer (GET /orders/available) con su búsqueda y página.
 * Lo usa `Tracking` para la lista y para el contador de la pestaña: una sola consulta, un solo `total`.
 */
export const useAvailablePool = (isOnline: boolean): AvailablePool => {
  const [search, setSearchState] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(search.trim());

  // Sin socket no hay forma de saber cuándo un chofer toma un pedido del pool: se sondea.
  const query = useAvailableOrders({ page, pageSize: POOL_PAGE_SIZE }, debouncedSearch, {
    refetchInterval: isOnline ? false : 15_000,
  });

  const total = query.data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / POOL_PAGE_SIZE) - 1);

  // Si al asignar o cancelar la última página se vació, se vuelve a la última que tenga pedidos.
  useEffect(() => {
    if (query.data && page > lastPage) setPage(lastPage);
  }, [query.data, page, lastPage]);

  return {
    search,
    setSearch: (value) => {
      setSearchState(value);
      setPage(0);
    },
    page,
    setPage,
    orders: query.data?.orders ?? [],
    total,
    isLoading: query.isPending && !query.data,
    isError: query.isError && !query.data,
    error: query.error,
    refetch: () => void query.refetch(),
  };
};
