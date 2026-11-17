import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelPlanningCase,
  confirmPlanningCase,
  forceTaskWindow,
  getPlannerAccuracy,
  getPlannerForecast,
  getPlannerSettings,
  getPlanningCase,
  listPlanningCases,
  patchPlannerSettings,
  replanTask,
  runPlanner,
  type PlanningCaseFilters,
} from '../api/planner';
import type {
  CancelPlanningCaseBody,
  ConfirmPlanningCaseBody,
  ForceWindowBody,
  PatchPlannerSettingsBody,
} from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.fleetPlanner;

interface Options {
  enabled?: boolean;
}

/** Los casos del planificador de taller, paginados, con los totales por estado. */
export const usePlanningCases = (
  pagination: { page: number; pageSize: number },
  filters: PlanningCaseFilters,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: keys.list({ ...pagination, ...filters }),
    queryFn: () => listPlanningCases(pagination, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Un caso con todas sus propuestas y el cuadro de ventanas. */
export const usePlanningCase = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(`case:${id}`),
    queryFn: () => getPlanningCase(id ?? ''),
    enabled: Boolean(id),
  });

/** Los vencimientos proyectados; con `carId`, sólo los de ese vehículo (su ficha). */
export const usePlannerForecast = (carId?: string, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.detail(`forecast:${carId ?? 'all'}`),
    queryFn: () => getPlannerForecast(carId),
    enabled,
  });

/** Cuánto acierta la fecha proyectada de los vencimientos, contra cuándo se hizo el trabajo. */
export const usePlannerAccuracy = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('accuracy'), queryFn: getPlannerAccuracy, enabled });

export const usePlannerSettings = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('settings'), queryFn: getPlannerSettings, enabled });

export const useUpdatePlannerSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchPlannerSettingsBody) => patchPlannerSettings(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(keys.detail('settings'), saved);
      return queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
};

/** Cualquier acción del planificador cambia casos, propuestas y vencimientos: se refresca todo lo suyo (y las tareas). */
const useRefreshing = <V, R>(mutationFn: (variables: V) => Promise<R>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.fleet.all }),
      ]),
  });
};

export const useRunPlanner = () => useRefreshing(() => runPlanner());

export const useConfirmPlanningCase = () =>
  useRefreshing(({ id, body }: { id: string; body: ConfirmPlanningCaseBody }) => confirmPlanningCase(id, body));

export const useCancelPlanningCase = () =>
  useRefreshing(({ id, body }: { id: string; body: CancelPlanningCaseBody }) => cancelPlanningCase(id, body));

export const useForceTaskWindow = () =>
  useRefreshing(({ taskId, body }: { taskId: string; body: ForceWindowBody }) => forceTaskWindow(taskId, body));

export const useReplanTask = () => useRefreshing((taskId: string) => replanTask(taskId));
