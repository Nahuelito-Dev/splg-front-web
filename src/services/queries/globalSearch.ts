import { useQueries } from '@tanstack/react-query';
import { getCarByPatent } from '../api/cars';
import { listCustomers } from '../api/customers';
import { listDeliveries } from '../api/deliveries';
import { listOrders } from '../api/orders';
import { queryKeys } from './queryKeys';

const keys = queryKeys.search;
const PAGE = { page: 0, pageSize: 5 };
export const MIN_SEARCH_LENGTH = 2;

/**
 * Buscador global: pedidos, clientes, choferes y vehículos (por patente) con el
 * mismo `term` que usa cada listado. Sin `enabled` (término corto o sin
 * distribuidora elegida) no pide nada.
 */
export const useGlobalSearch = (term: string, enabled: boolean) => {
  const active = enabled && term.length >= MIN_SEARCH_LENGTH;
  const options = { enabled: active, retry: false, staleTime: 30_000 } as const;

  const [orders, customers, deliveries, cars] = useQueries({
    queries: [
      { queryKey: keys.list({ kind: 'orders', term }), queryFn: () => listOrders(PAGE, { search: term }), ...options },
      { queryKey: keys.list({ kind: 'customers', term }), queryFn: () => listCustomers(PAGE, term), ...options },
      { queryKey: keys.list({ kind: 'deliveries', term }), queryFn: () => listDeliveries(PAGE, term), ...options },
      { queryKey: keys.list({ kind: 'cars', term }), queryFn: () => getCarByPatent(term), ...options },
    ],
  });

  return {
    orders: orders.data?.orders ?? [],
    customers: customers.data?.rows ?? [],
    deliveries: deliveries.data?.rows ?? [],
    cars: cars.data ? [cars.data] : [],
    isLoading: active && [orders, customers, deliveries, cars].some((q) => q.isFetching),
  };
};
