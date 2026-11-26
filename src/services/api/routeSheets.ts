import { isAxiosError } from 'axios';
import { env } from '../../config/env';
import { ApiError, toApiError } from './errors';
import { http } from './httpClient';
import type {
  AddRouteSheetStopBody,
  CloseRouteSheet,
  CloseRouteSheetBody,
  ConfirmAll,
  ConfirmRouteSheetBody,
  CreateRoutePlanningHolidayBody,
  CreateRouteSheetBody,
  FailedStopBody,
  LateOrder,
  LoadSuggestion,
  MoveRouteSheetStopBody,
  PatchRoutePlanningSettingsV3Body,
  ProcessConfig,
  RoutePlanDay,
  RoutePlanProposal,
  RoutePlanningHoliday,
  ServiceTime,
  RouteSheet,
  RouteSheetExecution,
  RouteSheetMove,
  RouteSheetNotConfirmable,
  RouteSheetOptimize,
  RouteSheetPage,
  RouteSheetPath,
  RouteSheetStopAction,
  RouteSheetViolation,
  SetRouteSheetSequenceBody,
  StartRouteSheet,
  StartRouteSheetBody,
  StartRouteSheetShortage,
  UpdateRouteSheetBody,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };
const v3 = { baseURL: env.apiUrlV3 };

/** Códigos del back que el panel trata aparte (ver HOJA-DE-RUTA.md, «Versión optimista»). */
export const ROUTE_SHEET_CODES = {
  versionConflict: 'ROUTE_SHEET_VERSION_CONFLICT',
  busy: 'ROUTE_SHEET_BUSY',
  notConfirmable: 'ROUTE_SHEET_NOT_CONFIRMABLE',
  notEditable: 'ROUTE_SHEET_NOT_EDITABLE',
  planNotFound: 'ROUTE_PLAN_NOT_FOUND',
  planningDisabled: 'ROUTE_PLANNING_DISABLED',
  stopNotFeasible: 'ROUTE_STOP_NOT_FEASIBLE',
  shortages: 'ROUTE_SHEET_SHORTAGES',
  notInProgress: 'ROUTE_SHEET_NOT_IN_PROGRESS',
  stopNotPending: 'ROUTE_STOP_NOT_PENDING',
  holidayPast: 'ROUTE_HOLIDAY_DATE_PAST',
  holidayExists: 'ROUTE_HOLIDAY_ALREADY_EXISTS',
  pathDailyLimit: 'ROUTE_PATH_DAILY_LIMIT',
  providerFailed: 'ROUTE_PROVIDER_FAILED',
  providerUnavailable: 'ROUTE_PROVIDER_UNAVAILABLE',
} as const;

/** 409 de confirmar con las reglas que no se cumplen: el panel las muestra una por una. */
export class RouteSheetNotConfirmableError extends ApiError {
  constructor(
    messages: string[],
    readonly violations: RouteSheetViolation[],
  ) {
    super(409, messages, ROUTE_SHEET_CODES.notConfirmable);
    this.name = 'RouteSheetNotConfirmableError';
  }
}

const isNotConfirmableBody = (value: unknown): value is RouteSheetNotConfirmable =>
  typeof value === 'object' &&
  value !== null &&
  (value as { code?: unknown }).code === ROUTE_SHEET_CODES.notConfirmable &&
  Array.isArray((value as { violations?: unknown }).violations);

/** Un 409 de confirmar trae `violations[]`, que `toApiError` no guarda: se conservan en un error propio. */
const withViolations = (error: unknown): unknown => {
  if (isAxiosError(error) && error.response?.status === 409 && isNotConfirmableBody(error.response.data)) {
    return new RouteSheetNotConfirmableError(toApiError(error).messages, error.response.data.violations);
  }
  return error;
};

/** 409 de iniciar porque al camión le faltan garrafas: el panel muestra cuáles y deja salir igual (D-04). */
export class RouteSheetShortagesError extends ApiError {
  constructor(
    messages: string[],
    readonly shortages: StartRouteSheetShortage[],
  ) {
    super(409, messages, ROUTE_SHEET_CODES.shortages);
    this.name = 'RouteSheetShortagesError';
  }
}

const isShortagesBody = (value: unknown): value is { shortages: StartRouteSheetShortage[] } =>
  typeof value === 'object' &&
  value !== null &&
  (value as { code?: unknown }).code === ROUTE_SHEET_CODES.shortages &&
  Array.isArray((value as { shortages?: unknown }).shortages);

/** Un 409 de iniciar trae `shortages[]`, que `toApiError` no guarda: se conservan en un error propio. */
const withShortages = (error: unknown): unknown => {
  if (isAxiosError(error) && error.response?.status === 409 && isShortagesBody(error.response.data)) {
    return new RouteSheetShortagesError(toApiError(error).messages, error.response.data.shortages);
  }
  return error;
};

/** GET /v2/route-plans/:date: el día con sus hojas vivas, lo que quedó sin hoja y los choferes y vehículos. 404 si no se abrió. */
export const getRoutePlanDay = async (date: string): Promise<RoutePlanDay> => {
  const { data } = await http.get<RoutePlanDay>(`/route-plans/${encodeURIComponent(date)}`, v2);
  return data;
};

/** POST /v2/route-plans/:date/open: abre el día (idempotente). */
export const openRoutePlanDay = async (date: string): Promise<RoutePlanDay> => {
  const { data } = await http.post<RoutePlanDay>(`/route-plans/${encodeURIComponent(date)}/open`, undefined, v2);
  return data;
};

/** POST /v2/route-plans/:date/propose: con `dryRun` sólo calcula; sin él crea los borradores. */
export const proposeRoutePlan = async (date: string, dryRun: boolean): Promise<RoutePlanProposal> => {
  const { data } = await http.post<RoutePlanProposal>(
    `/route-plans/${encodeURIComponent(date)}/propose`,
    { dryRun },
    v2,
  );
  return data;
};

/** POST /v2/route-plans/:date/close: cierra el día y descarta los borradores. */
export const closeRoutePlanDay = async (date: string): Promise<RoutePlanDay> => {
  const { data } = await http.post<RoutePlanDay>(`/route-plans/${encodeURIComponent(date)}/close`, undefined, v2);
  return data;
};

/** POST /v2/route-plans/:date/confirm-all: confirma cada borrador; los que no se pueden vienen en `failed`. */
export const confirmAllRouteSheets = async (date: string): Promise<ConfirmAll> => {
  const { data } = await http.post<ConfirmAll>(`/route-plans/${encodeURIComponent(date)}/confirm-all`, undefined, v2);
  return data;
};

/** GET /v2/route-plans/:date/late-orders: los pedidos que entraron después del cierre, con dónde conviene meterlos. */
export const getLateOrders = async (date: string): Promise<LateOrder[]> => {
  const { data } = await http.get<LateOrder[]>(`/route-plans/${encodeURIComponent(date)}/late-orders`, v2);
  return data;
};

/** GET /v2/route-planning/settings */
export const getRoutePlanningSettings = async (): Promise<ProcessConfig> => {
  const { data } = await http.get<ProcessConfig>('/route-planning/settings', v2);
  return data;
};

/**
 * PATCH /v3/route-planning/settings: cambia sólo los parámetros que vienen. La v3 suma `serviceMinutesMode`
 * (`fixed` | `learned`) a los de la v2.
 */
export const patchRoutePlanningSettings = async (body: PatchRoutePlanningSettingsV3Body): Promise<ProcessConfig> => {
  const { data } = await http.patch<ProcessConfig>('/route-planning/settings', body, v3);
  return data;
};

/** GET /v3/route-planning/service-time: el tiempo de atención aprendido (sugerido) frente al que rige (vigente). */
export const getRouteServiceTime = async (): Promise<ServiceTime> => {
  const { data } = await http.get<ServiceTime>('/route-planning/service-time', v3);
  return data;
};

export interface RouteSheetFilters {
  date: string;
  status?: RouteSheet['status'];
  deliveryId?: string;
  limit?: number;
  offset?: number;
}

/** GET /v2/route-sheets: las hojas de un día, también las canceladas (el día sólo trae las vivas). */
export const listRouteSheets = async (filters: RouteSheetFilters): Promise<RouteSheetPage> => {
  const { data } = await http.get<RouteSheetPage>('/route-sheets', { ...v2, params: filters });
  return data;
};

/** GET /v2/route-sheets/:id */
export const getRouteSheet = async (id: string): Promise<RouteSheet> => {
  const { data } = await http.get<RouteSheet>(`/route-sheets/${encodeURIComponent(id)}`, v2);
  return data;
};

/** POST /v2/route-sheets: un borrador a mano (abre el día si hace falta). */
export const createRouteSheet = async (body: CreateRouteSheetBody): Promise<RouteSheet> => {
  const { data } = await http.post<RouteSheet>('/route-sheets', body, v2);
  return data;
};

/**
 * GET /v2/route-sheets/:id/path: el recorrido por calles (galpón → paradas → galpón) con la polilínea codificada.
 * 429 `ROUTE_PATH_DAILY_LIMIT`, 502 `ROUTE_PROVIDER_FAILED`, 503 `ROUTE_PROVIDER_UNAVAILABLE`.
 */
export const getRouteSheetPath = async (id: string): Promise<RouteSheetPath> => {
  const { data } = await http.get<RouteSheetPath>(`/route-sheets/${encodeURIComponent(id)}/path`, v2);
  return data;
};

/** PATCH /v2/route-sheets/:id: chofer, vehículo o salida. */
export const updateRouteSheet = async (id: string, body: UpdateRouteSheetBody): Promise<RouteSheet> => {
  const { data } = await http.patch<RouteSheet>(`/route-sheets/${encodeURIComponent(id)}`, body, v2);
  return data;
};

/** POST /v2/route-sheets/:id/stops: agrega un pedido donde conviene (o en `position`). */
export const addRouteSheetStop = async (id: string, body: AddRouteSheetStopBody): Promise<RouteSheet> => {
  const { data } = await http.post<RouteSheet>(`/route-sheets/${encodeURIComponent(id)}/stops`, body, v2);
  return data;
};

/** DELETE /v2/route-sheets/:id/stops/:orderId: el pedido vuelve a «Sin asignar». */
export const removeRouteSheetStop = async (id: string, orderId: string, version: number): Promise<RouteSheet> => {
  const { data } = await http.delete<RouteSheet>(
    `/route-sheets/${encodeURIComponent(id)}/stops/${encodeURIComponent(orderId)}`,
    { ...v2, data: { version } },
  );
  return data;
};

/** POST /v2/route-sheets/:id/stops/:orderId/move: pasa la parada a otra hoja del mismo día. */
export const moveRouteSheetStop = async (
  id: string,
  orderId: string,
  body: MoveRouteSheetStopBody,
): Promise<RouteSheetMove> => {
  const { data } = await http.post<RouteSheetMove>(
    `/route-sheets/${encodeURIComponent(id)}/stops/${encodeURIComponent(orderId)}/move`,
    body,
    v2,
  );
  return data;
};

/** PUT /v2/route-sheets/:id/sequence: el orden a mano (todas las paradas) y cuáles quedan fijas. */
export const setRouteSheetSequence = async (id: string, body: SetRouteSheetSequenceBody): Promise<RouteSheet> => {
  const { data } = await http.put<RouteSheet>(`/route-sheets/${encodeURIComponent(id)}/sequence`, body, v2);
  return data;
};

/** POST /v2/route-sheets/:id/optimize: reordena respetando las fijas; devuelve el antes y el después. */
export const optimizeRouteSheet = async (id: string, version: number): Promise<RouteSheetOptimize> => {
  const { data } = await http.post<RouteSheetOptimize>(
    `/route-sheets/${encodeURIComponent(id)}/optimize`,
    { version },
    v2,
  );
  return data;
};

/** POST /v2/route-sheets/:id/confirm: 409 con `violations` si no se puede (ver `RouteSheetNotConfirmableError`). */
export const confirmRouteSheet = async (id: string, body: ConfirmRouteSheetBody): Promise<RouteSheet> => {
  try {
    const { data } = await http.post<RouteSheet>(`/route-sheets/${encodeURIComponent(id)}/confirm`, body, v2);
    return data;
  } catch (error) {
    throw withViolations(error);
  }
};

/** POST /v2/route-sheets/:id/reopen: una confirmada vuelve a borrador. */
export const reopenRouteSheet = async (id: string, version: number): Promise<RouteSheet> => {
  const { data } = await http.post<RouteSheet>(`/route-sheets/${encodeURIComponent(id)}/reopen`, { version }, v2);
  return data;
};

/** POST /v2/route-sheets/:id/cancel: la hoja queda descartada y sus pedidos vuelven a «Sin asignar». */
export const cancelRouteSheet = async (id: string, version: number): Promise<RouteSheet> => {
  const { data } = await http.post<RouteSheet>(`/route-sheets/${encodeURIComponent(id)}/cancel`, { version }, v2);
  return data;
};

/** GET /v2/route-sheets/:id/load-suggestion: qué garrafas cargar y cuántos envases vuelven. */
export const getLoadSuggestion = async (id: string): Promise<LoadSuggestion> => {
  const { data } = await http.get<LoadSuggestion>(`/route-sheets/${encodeURIComponent(id)}/load-suggestion`, v2);
  return data;
};

/** GET /v2/route-sheets/:id/execution: el seguimiento de la hoja (avance, horas vigentes y posición del chofer). Sólo lee. */
export const getRouteSheetExecution = async (id: string): Promise<RouteSheetExecution> => {
  const { data } = await http.get<RouteSheetExecution>(`/route-sheets/${encodeURIComponent(id)}/execution`, v2);
  return data;
};

/**
 * POST /v2/route-sheets/:id/start: el admin la inicia en nombre del chofer. Si al camión le faltan garrafas responde
 * 409 con `shortages` (ver `RouteSheetShortagesError`); con `acknowledgeShortages` sale igual.
 */
export const startRouteSheet = async (id: string, body: StartRouteSheetBody): Promise<StartRouteSheet> => {
  try {
    const { data } = await http.post<StartRouteSheet>(`/route-sheets/${encodeURIComponent(id)}/start`, body, v2);
    return data;
  } catch (error) {
    throw withShortages(error);
  }
};

/** POST /v2/route-sheets/:id/stops/:orderId/failed: la parada no se entregó; el pedido vuelve al despacho. */
export const failRouteSheetStop = async (
  id: string,
  orderId: string,
  body: FailedStopBody,
): Promise<RouteSheetStopAction> => {
  const { data } = await http.post<RouteSheetStopAction>(
    `/route-sheets/${encodeURIComponent(id)}/stops/${encodeURIComponent(orderId)}/failed`,
    body,
    v2,
  );
  return data;
};

/** POST /v2/route-sheets/:id/close: cierre a mano; lo pendiente sale y vuelve al despacho. */
export const closeRouteSheet = async (id: string, body: CloseRouteSheetBody): Promise<CloseRouteSheet> => {
  const { data } = await http.post<CloseRouteSheet>(`/route-sheets/${encodeURIComponent(id)}/close`, body, v2);
  return data;
};

/** GET /v2/route-planning/holidays: los feriados vigentes desde `from` (por omisión, hoy). */
export const listRoutePlanningHolidays = async (params: { from?: string; to?: string } = {}) => {
  const { data } = await http.get<RoutePlanningHoliday[]>('/route-planning/holidays', { ...v2, params });
  return data;
};

/** POST /v2/route-planning/holidays: ese día no se reparte. 409 si es pasado o ya está cargado. */
export const createRoutePlanningHoliday = async (body: CreateRoutePlanningHolidayBody) => {
  const { data } = await http.post<RoutePlanningHoliday>('/route-planning/holidays', body, v2);
  return data;
};

/** DELETE /v2/route-planning/holidays/:id: baja lógica, el día vuelve a ser hábil. */
export const deleteRoutePlanningHoliday = async (id: string): Promise<void> => {
  await http.delete(`/route-planning/holidays/${encodeURIComponent(id)}`, v2);
};
