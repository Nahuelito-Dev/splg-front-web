import { useMutation, useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toApiError } from '../api/errors';
import {
  ROUTE_SHEET_CODES,
  addRouteSheetStop,
  cancelRouteSheet,
  closeRoutePlanDay,
  closeRouteSheet,
  confirmAllRouteSheets,
  createRoutePlanningHoliday,
  confirmRouteSheet,
  createRouteSheet,
  deleteRoutePlanningHoliday,
  failRouteSheetStop,
  getLateOrders,
  getLoadSuggestion,
  getRoutePlanDay,
  getRoutePlanningSettings,
  getRouteServiceTime,
  getRouteSheet,
  getRouteSheetExecution,
  getRouteSheetPath,
  listRoutePlanningHolidays,
  listRouteSheets,
  moveRouteSheetStop,
  openRoutePlanDay,
  optimizeRouteSheet,
  patchRoutePlanningSettings,
  proposeRoutePlan,
  removeRouteSheetStop,
  reopenRouteSheet,
  setRouteSheetSequence,
  startRouteSheet,
  updateRouteSheet,
} from '../api/routeSheets';
import { cancelOrder, updateOrder } from '../api/orders';
import type {
  CreateRoutePlanningHolidayBody,
  CreateRouteSheetBody,
  FailedStopBody,
  PatchRoutePlanningSettingsV3Body,
  RoutePlanDay,
  RouteSheet,
  RouteSheetExecution,
  UpdateRouteSheetBody,
} from '../api/types';
import { queryKeys } from './queryKeys';

const plans = queryKeys.routePlans;
const sheets = queryKeys.routeSheets;

/** Clave del día y de lo que cuelga de él (tardíos): invalidar el día refresca todo. */
export const routePlanKeys = {
  day: (date: string) => plans.detail(date),
  lateOrders: (date: string) => [...plans.detail(date), 'late-orders'] as const,
  settings: () => plans.detail('settings'),
  serviceTime: () => plans.detail('service-time'),
  holidays: () => plans.detail('holidays'),
};

export const routeSheetKeys = {
  detail: (id: string) => sheets.detail(id),
  loadSuggestion: (id: string) => [...sheets.detail(id), 'load-suggestion'] as const,
  /** Cuelga del detalle: lo que invalida la hoja también refresca su seguimiento. */
  execution: (id: string) => [...sheets.detail(id), 'execution'] as const,
  /** También cuelga del detalle: al cambiar las paradas se vuelve a pedir (el back no consulta a Google si no cambiaron). */
  path: (id: string) => [...sheets.detail(id), 'path'] as const,
  dissolved: (date: string) => sheets.list({ date, status: 'dissolved' }),
};

interface Options {
  enabled?: boolean;
}

/** El día: 404 `ROUTE_PLAN_NOT_FOUND` mientras no se abra (la página ofrece abrirlo). */
export const useRoutePlanDay = (date: string, { enabled = true }: Options = {}) =>
  useQuery({ queryKey: routePlanKeys.day(date), queryFn: () => getRoutePlanDay(date), enabled: enabled && !!date });

export const useLateOrders = (date: string, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: routePlanKeys.lateOrders(date),
    queryFn: () => getLateOrders(date),
    enabled: enabled && !!date,
  });

/** Las hojas canceladas o descartadas del día: el día sólo trae las vivas. */
export const useDissolvedRouteSheets = (date: string, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: routeSheetKeys.dissolved(date),
    queryFn: () => listRouteSheets({ date, status: 'dissolved', limit: 50 }),
    enabled: enabled && !!date,
  });

export const useRouteSheet = (id: string | undefined) =>
  useQuery({ queryKey: routeSheetKeys.detail(id ?? ''), queryFn: () => getRouteSheet(id ?? ''), enabled: !!id });

/**
 * El seguimiento de una hoja confirmada, en curso o cerrada. `refetchInterval` es el respaldo del socket (sin él,
 * o en modo soporte, que no recibe tiempo real).
 */
export const useRouteSheetExecution = (
  id: string | undefined,
  { enabled = true, refetchInterval = false }: Options & { refetchInterval?: number | false } = {},
) =>
  useQuery({
    queryKey: routeSheetKeys.execution(id ?? ''),
    queryFn: () => getRouteSheetExecution(id ?? ''),
    enabled: enabled && !!id,
    refetchInterval,
  });

/**
 * El recorrido por calles de la hoja para el mapa. Sin reintentos: un 429/502/503 se muestra y el mapa une las paradas
 * en línea recta (reintentar gastaría el cupo diario del proveedor).
 */
export const useRouteSheetPath = (id: string | undefined) =>
  useQuery({
    queryKey: routeSheetKeys.path(id ?? ''),
    queryFn: () => getRouteSheetPath(id ?? ''),
    enabled: !!id,
    retry: false,
  });

/**
 * Los recorridos por calles de varias hojas, **sólo los que ya están en caché** (los pidió el mapa de cada hoja): no
 * consulta al back, así que no gasta el cupo diario del proveedor. Devuelve `null` para las que todavía no se trazaron.
 */
export const useCachedRouteSheetPaths = (ids: string[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: routeSheetKeys.path(id),
      queryFn: () => getRouteSheetPath(id),
      enabled: false,
    })),
    combine: (results) => results.map((result) => result.data ?? null),
  });

export const useLoadSuggestion = (id: string | undefined) =>
  useQuery({
    queryKey: routeSheetKeys.loadSuggestion(id ?? ''),
    queryFn: () => getLoadSuggestion(id ?? ''),
    enabled: !!id,
  });

export const useRoutePlanningSettings = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: routePlanKeys.settings(), queryFn: getRoutePlanningSettings, enabled });

/** El tiempo de atención aprendido y el vigente (tarjeta de los parámetros de las hojas de ruta). */
export const useRouteServiceTime = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: routePlanKeys.serviceTime(), queryFn: getRouteServiceTime, enabled });

export const useUpdateRoutePlanningSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchRoutePlanningSettingsV3Body) => patchRoutePlanningSettings(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(routePlanKeys.settings(), saved);
      // El modo cambia lo que rige («vigente»).
      void queryClient.invalidateQueries({ queryKey: routePlanKeys.serviceTime() });
      // Los mismos parámetros se ven en «Procesos automáticos».
      return queryClient.invalidateQueries({ queryKey: queryKeys.moduleConfig.all });
    },
  });
};

/**
 * El día con la hoja que acaba de devolver el back: así la próxima edición (mover a otra hoja, agregar) ya manda la
 * `version` nueva aunque el día todavía no se haya vuelto a pedir. Una hoja descartada sale del día.
 */
export const withSheet = (day: RoutePlanDay | undefined, sheet: RouteSheet): RoutePlanDay | undefined => {
  if (!day) return day;
  const others = day.sheets.filter((s) => s.id !== sheet.id);
  if (sheet.status === 'dissolved') return { ...day, sheets: others };
  const known = day.sheets.some((s) => s.id === sheet.id);
  return { ...day, sheets: known ? day.sheets.map((s) => (s.id === sheet.id ? sheet : s)) : [...day.sheets, sheet] };
};

/** Una hoja o el día cambian lo que se ve en el día, en las hojas y en los pedidos (vuelven o salen del pool). */
const refreshAll = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: plans.all }),
    queryClient.invalidateQueries({ queryKey: sheets.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
  ]);

/** Otra sesión tiene tomada la hoja en este instante: el back pide reintentar. */
export const isSheetBusy = (error: unknown) => toApiError(error).code === ROUTE_SHEET_CODES.busy;
/** La hoja cambió desde que se leyó: hay que recargarla. */
export const isVersionConflict = (error: unknown) => toApiError(error).code === ROUTE_SHEET_CODES.versionConflict;

/** Hasta 3 reintentos si la hoja está tomada; ningún otro error se reintenta. */
export const retryWhenBusy = (failureCount: number, error: unknown) => isSheetBusy(error) && failureCount < 3;
const busyDelay = (attempt: number) => 300 * (attempt + 1);

/**
 * Toda edición de una hoja: manda la `version` que se vio, guarda las hojas que devuelve el back y refresca el día.
 * Ante un 409 de versión recarga igual (el aviso lo da la página); si la hoja está tomada, reintenta sola.
 */
const useSheetMutation = <V, R>(mutationFn: (variables: V) => Promise<R>, sheetsOf: (result: R) => RouteSheet[]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    retry: retryWhenBusy,
    retryDelay: busyDelay,
    onSuccess: (result) => {
      for (const sheet of sheetsOf(result)) {
        queryClient.setQueryData(routeSheetKeys.detail(sheet.id), sheet);
        queryClient.setQueryData<RoutePlanDay>(routePlanKeys.day(sheet.planDate), (day?: RoutePlanDay) =>
          withSheet(day, sheet),
        );
      }
      return refreshAll(queryClient);
    },
    onError: (error) => (isVersionConflict(error) ? refreshAll(queryClient) : undefined),
  });
};

const one = (sheet: RouteSheet) => [sheet];
const none = () => [];

export const useOpenRoutePlanDay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => openRoutePlanDay(date),
    onSuccess: (day) => {
      queryClient.setQueryData(routePlanKeys.day(day.plan.date), day);
      return refreshAll(queryClient);
    },
  });
};

/** Proponer: la vista previa (`dryRun`) no cambia nada y no refresca; la real sí. */
export const useProposeRoutePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, dryRun }: { date: string; dryRun: boolean }) => proposeRoutePlan(date, dryRun),
    onSuccess: (proposal) => (proposal.dryRun ? undefined : refreshAll(queryClient)),
  });
};

export const useCloseRoutePlanDay = () => useSheetMutation((date: string) => closeRoutePlanDay(date), none);

export const useConfirmAllRouteSheets = () => useSheetMutation((date: string) => confirmAllRouteSheets(date), none);

export const useCreateRouteSheet = () => useSheetMutation((body: CreateRouteSheetBody) => createRouteSheet(body), one);

export const useUpdateRouteSheet = () =>
  useSheetMutation(
    ({ sheet, changes }: { sheet: RouteSheet; changes: Omit<UpdateRouteSheetBody, 'version'> }) =>
      updateRouteSheet(sheet.id, { ...changes, version: sheet.version }),
    one,
  );

export interface AddStopVariables {
  sheet: RouteSheet;
  orderId: string;
  position?: number;
  acceptLateStops?: boolean;
}

export const useAddRouteSheetStop = () =>
  useSheetMutation(
    ({ sheet, orderId, position, acceptLateStops }: AddStopVariables) =>
      addRouteSheetStop(sheet.id, {
        version: sheet.version,
        orderId,
        position,
        lock: false,
        acceptLateStops: Boolean(acceptLateStops),
      }),
    one,
  );

export const useRemoveRouteSheetStop = () =>
  useSheetMutation(
    ({ sheet, orderId }: { sheet: RouteSheet; orderId: string }) =>
      removeRouteSheetStop(sheet.id, orderId, sheet.version),
    one,
  );

export interface MoveStopVariables {
  sheet: RouteSheet;
  orderId: string;
  target: RouteSheet;
  position?: number;
  acceptLateStops?: boolean;
}

export const useMoveRouteSheetStop = () =>
  useSheetMutation(
    ({ sheet, orderId, target, position, acceptLateStops }: MoveStopVariables) =>
      moveRouteSheetStop(sheet.id, orderId, {
        version: sheet.version,
        targetSheetId: target.id,
        targetVersion: target.version,
        position,
        acceptLateStops: Boolean(acceptLateStops),
      }),
    (moved) => [moved.source, moved.target],
  );

export const useSetRouteSheetSequence = () =>
  useSheetMutation(
    ({ sheet, orderIds, locked }: { sheet: RouteSheet; orderIds: string[]; locked: string[] }) =>
      setRouteSheetSequence(sheet.id, { version: sheet.version, orderIds, locked }),
    one,
  );

export const useOptimizeRouteSheet = () =>
  useSheetMutation(
    (sheet: RouteSheet) => optimizeRouteSheet(sheet.id, sheet.version),
    (optimized) => [optimized.sheet],
  );

export const useConfirmRouteSheet = () =>
  useSheetMutation(
    ({ sheet, acceptLateStops }: { sheet: RouteSheet; acceptLateStops?: boolean }) =>
      confirmRouteSheet(sheet.id, { version: sheet.version, acceptLateStops: Boolean(acceptLateStops) }),
    one,
  );

export const useReopenRouteSheet = () =>
  useSheetMutation((sheet: RouteSheet) => reopenRouteSheet(sheet.id, sheet.version), one);

export const useCancelRouteSheet = () =>
  useSheetMutation((sheet: RouteSheet) => cancelRouteSheet(sheet.id, sheet.version), one);

/**
 * Las acciones sobre la hoja en curso (iniciar, no entregada, cerrar) no devuelven la hoja: al terminar se refresca
 * el día, la hoja, su seguimiento y los pedidos. Si la hoja está tomada, reintenta sola.
 */
const useExecutionMutation = <V, R>(mutationFn: (variables: V) => Promise<R>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    retry: retryWhenBusy,
    retryDelay: busyDelay,
    onSuccess: () => refreshAll(queryClient),
  });
};

export const useStartRouteSheet = () =>
  useExecutionMutation(({ sheetId, acknowledgeShortages }: { sheetId: string; acknowledgeShortages?: boolean }) =>
    startRouteSheet(sheetId, { acknowledgeShortages: Boolean(acknowledgeShortages) }),
  );

export const useFailRouteSheetStop = () =>
  useExecutionMutation(({ sheetId, orderId, body }: { sheetId: string; orderId: string; body: FailedStopBody }) =>
    failRouteSheetStop(sheetId, orderId, body),
  );

export const useCloseRouteSheet = () =>
  useExecutionMutation(({ sheetId, reason }: { sheetId: string; reason: string }) =>
    closeRouteSheet(sheetId, { reason }),
  );

/** Las horas nuevas que manda el socket, sobre el seguimiento guardado (sin volver a pedirlo). */
export const withEtas = (
  execution: RouteSheetExecution | undefined,
  etas: { orderId: string; etaAt: string; late: boolean }[],
): RouteSheetExecution | undefined => {
  if (!execution) return execution;
  const byOrder = new Map(etas.map((e) => [e.orderId, e]));
  return {
    ...execution,
    stops: execution.stops.map((stop) => {
      const eta = byOrder.get(stop.orderId);
      return eta ? { ...stop, etaAt: eta.etaAt, late: eta.late } : stop;
    }),
  };
};

/**
 * El seguimiento de varias hojas a la vez (las en curso o cerradas del día): de ahí salen los pedidos que esperan al
 * admin. La API no tiene un listado propio de esos pedidos.
 */
export const useRouteSheetExecutions = (ids: string[], { enabled = true }: Options = {}) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: routeSheetKeys.execution(id),
      queryFn: () => getRouteSheetExecution(id),
      enabled,
    })),
  });

/** Un pedido que espera al admin: cambiarle la fecha (`PATCH /orders/:id`, la franja la decide la planificación). */
export const useRescheduleAwaitingOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, scheduledDate }: { orderId: string; scheduledDate: string }) =>
      updateOrder(orderId, { scheduledDate }),
    onSuccess: () => refreshAll(queryClient),
  });
};

/** Un pedido que espera al admin: cancelarlo con motivo (`PATCH /orders/:id/cancel`). */
export const useCancelAwaitingOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) => cancelOrder(orderId, { reason }),
    onSuccess: () => refreshAll(queryClient),
  });
};

/** Los feriados de la distribuidora desde hoy. */
export const useRoutePlanningHolidays = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: routePlanKeys.holidays(), queryFn: () => listRoutePlanningHolidays(), enabled });

export const useCreateRoutePlanningHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoutePlanningHolidayBody) => createRoutePlanningHoliday(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routePlanKeys.holidays() }),
  });
};

export const useDeleteRoutePlanningHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoutePlanningHoliday(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routePlanKeys.holidays() }),
  });
};
