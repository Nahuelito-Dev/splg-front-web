import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignCylinders,
  createCylinder,
  getCylinder,
  getCylinderHistory,
  listCylinders,
  transitionCylinder,
  type CylinderFilters,
} from '../api/physicalCylinders';
import type { Page, PageParams } from '../api/httpClient';
import type { AssignCylindersBody, CreateCylinderBody, Cylinder, TransitionCylinderBody } from '../api/types';
import { filterCylinders } from '../../pages/PhysicalCylinders/cylinderFilters';
import { ALL_STATES, NEXT_STATES } from '../../pages/PhysicalCylinders/cylinderTransitions';
import { SKIP } from '../../utils/batch';
import { useBatchMutation } from './batchMutation';
import { queryKeys } from './queryKeys';

const keys = queryKeys.cylinders;

/**
 * Una página de envases. La API pagina y filtra por estado, pedido y cliente, pero no busca por texto: con un
 * término se traen todos los que cumplen el filtro (un depósito son cientos, no miles) y se busca y pagina acá.
 */
export const useCylinders = (
  filters: CylinderFilters,
  params: PageParams,
  term = '',
  { enabled = true }: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: keys.list({ ...filters, ...params, term }),
    queryFn: async (): Promise<Page<Cylinder>> => {
      if (!term.trim()) return listCylinders(filters, params);
      const found = filterCylinders((await listCylinders(filters)).rows, { state: 'all', term });
      return {
        rows: found.slice(params.page * params.pageSize, (params.page + 1) * params.pageSize),
        total: found.length,
      };
    },
    placeholderData: keepPreviousData,
    enabled,
  });

/** Cuántos envases hay por estado y en total (con los mismos filtros de pedido y cliente): el total real de la API. */
export const useCylinderStateCounts = ({ orderId, customerUserId }: Omit<CylinderFilters, 'state'>) => {
  const ONE: PageParams = { page: 0, pageSize: 1 };
  const states: (Cylinder['state'] | undefined)[] = [undefined, ...ALL_STATES];
  const results = useQueries({
    queries: states.map((state) => ({
      queryKey: keys.list({ counts: state ?? 'all', orderId, customerUserId }),
      queryFn: () => listCylinders({ state, orderId, customerUserId }, ONE).then((page) => page.total),
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    })),
  });
  return Object.fromEntries(states.map((state, i) => [state ?? 'all', results[i]?.data ?? null])) as Record<
    Cylinder['state'] | 'all',
    number | null
  >;
};

export const useCylinder = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getCylinder(id ?? ''),
    enabled: Boolean(id),
  });

export const useCylinderHistory = (id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: [...keys.detail(id ?? ''), 'history'],
    queryFn: () => getCylinderHistory(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useCreateCylinder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCylinderBody) => createCylinder(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useTransitionCylinder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TransitionCylinderBody }) => transitionCylinder(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useAssignCylinders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignCylindersBody) => assignCylinders(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/**
 * Mover varios envases al mismo estado: una llamada por envase, de a una. Antes de cada una se vuelve a pedir el
 * envase: si ya no puede pasar a ese estado se omite en vez de contarlo como falla.
 */
export const useBulkTransitionCylinders = () =>
  useBatchMutation<{ ids: string[]; toState: Cylinder['state'] }>({
    run: async ({ toState }, id) => {
      if (!NEXT_STATES[(await getCylinder(id)).state].includes(toState)) return SKIP;
      return transitionCylinder(id, { toState });
    },
    invalidate: keys.all,
    noun: ['envase', 'envases'],
    participle: ['movido', 'movidos'],
  });
