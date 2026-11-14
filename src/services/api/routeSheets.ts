import { isAxiosError } from 'axios';
import { env } from '../../config/env';
import { ApiError, toApiError } from './errors';
import { http } from './httpClient';
import type {
  AddRouteSheetStopBody,
  ConfirmAll,
  ConfirmRouteSheetBody,
  CreateRouteSheetBody,
  LateOrder,
  LoadSuggestion,
  MoveRouteSheetStopBody,
  PatchRoutePlanningSettingsBody,
  ProcessConfig,
  RoutePlanDay,
  RoutePlanProposal,
  RouteSheet,
  RouteSheetMove,
  RouteSheetNotConfirmable,
  RouteSheetOptimize,
  RouteSheetPage,
  RouteSheetViolation,
  SetRouteSheetSequenceBody,
  UpdateRouteSheetBody,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };

/** Códigos del back que el panel trata aparte (ver HOJA-DE-RUTA.md, «Versión optimista»). */
export const ROUTE_SHEET_CODES = {
  versionConflict: 'ROUTE_SHEET_VERSION_CONFLICT',
  busy: 'ROUTE_SHEET_BUSY',
  notConfirmable: 'ROUTE_SHEET_NOT_CONFIRMABLE',
  notEditable: 'ROUTE_SHEET_NOT_EDITABLE',
  planNotFound: 'ROUTE_PLAN_NOT_FOUND',
  planningDisabled: 'ROUTE_PLANNING_DISABLED',
  stopNotFeasible: 'ROUTE_STOP_NOT_FEASIBLE',
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

/** PATCH /v2/route-planning/settings: cambia sólo los parámetros que vienen. */
export const patchRoutePlanningSettings = async (body: PatchRoutePlanningSettingsBody): Promise<ProcessConfig> => {
  const { data } = await http.patch<ProcessConfig>('/route-planning/settings', body, v2);
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
