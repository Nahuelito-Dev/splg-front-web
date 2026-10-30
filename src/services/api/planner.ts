import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  CancelPlanningCaseBody,
  ConfirmPlanningCaseBody,
  ForceWindowBody,
  PatchPlannerSettingsBody,
  PlannerForecast,
  PlannerRun,
  PlanningCaseDetail,
  PlanningCasePage,
  ProcessConfig,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };

export interface PlanningCaseFilters {
  status?: PlanningCaseDetail['status'];
  carId?: string;
  /** Sólo los que esperan al administrador (escalados o a confirmar). */
  pending?: boolean;
}

/** GET /v2/fleet/maintenance-planner: los casos del planificador de taller, con los totales por estado (CU-105). */
export const listPlanningCases = async (
  { page, pageSize }: { page: number; pageSize: number },
  filters: PlanningCaseFilters = {},
): Promise<PlanningCasePage> => {
  const { data } = await http.get<PlanningCasePage>('/fleet/maintenance-planner', {
    ...v2,
    params: { ...filters, limit: pageSize, offset: page * pageSize },
  });
  return data;
};

/** GET /v2/fleet/maintenance-planner/cases/:id: un caso con todas sus propuestas y el cuadro de ventanas evaluadas. */
export const getPlanningCase = async (id: string): Promise<PlanningCaseDetail> => {
  const { data } = await http.get<PlanningCaseDetail>(`/fleet/maintenance-planner/cases/${id}`, v2);
  return data;
};

/** GET /v2/fleet/maintenance-planner/forecast: los vencimientos proyectados por vehículo, con el consumo que los explica. */
export const getPlannerForecast = async (carId?: string): Promise<PlannerForecast> => {
  const { data } = await http.get<PlannerForecast>('/fleet/maintenance-planner/forecast', {
    ...v2,
    params: carId ? { carId } : undefined,
  });
  return data;
};

/** GET /v2/fleet/maintenance-planner/settings: los parámetros del planificador con su rango y valor por omisión. */
export const getPlannerSettings = async (): Promise<ProcessConfig> => {
  const { data } = await http.get<ProcessConfig>('/fleet/maintenance-planner/settings', v2);
  return data;
};

/** PATCH /v2/fleet/maintenance-planner/settings: cambia sólo los parámetros que vienen. */
export const patchPlannerSettings = async (body: PatchPlannerSettingsBody): Promise<ProcessConfig> => {
  const { data } = await http.patch<ProcessConfig>('/fleet/maintenance-planner/settings', body, v2);
  return data;
};

/** POST /v2/fleet/maintenance-planner/run: corre el planificador ahora, sin esperar la hora diaria. */
export const runPlanner = async (): Promise<PlannerRun> => {
  const { data } = await http.post<PlannerRun>('/fleet/maintenance-planner/run', undefined, v2);
  return data;
};

/** POST /v2/fleet/maintenance-planner/cases/:id/confirm: confirma el taller (la ventana acordada, u otra que se elige). */
export const confirmPlanningCase = async (id: string, body: ConfirmPlanningCaseBody): Promise<PlanningCaseDetail> => {
  const { data } = await http.post<PlanningCaseDetail>(`/fleet/maintenance-planner/cases/${id}/confirm`, body, v2);
  return data;
};

/** POST /v2/fleet/maintenance-planner/cases/:id/cancel: cierra el caso sin programar nada. */
export const cancelPlanningCase = async (id: string, body: CancelPlanningCaseBody): Promise<PlanningCaseDetail> => {
  const { data } = await http.post<PlanningCaseDetail>(`/fleet/maintenance-planner/cases/${id}/cancel`, body, v2);
  return data;
};

/** POST /v2/fleet/maintenance-planner/tasks/:taskId/force-window: fija la ventana de una tarea sin esperar al planificador. */
export const forceTaskWindow = async (taskId: string, body: ForceWindowBody): Promise<PlanningCaseDetail> => {
  const { data } = await http.post<PlanningCaseDetail>(
    `/fleet/maintenance-planner/tasks/${taskId}/force-window`,
    body,
    v2,
  );
  return data;
};

/** POST /v2/fleet/maintenance-planner/tasks/:taskId/replan: descarta el caso abierto y planifica la tarea de nuevo. */
export const replanTask = async (taskId: string): Promise<PlanningCaseDetail> => {
  const { data } = await http.post<PlanningCaseDetail>(
    `/fleet/maintenance-planner/tasks/${taskId}/replan`,
    undefined,
    v2,
  );
  return data;
};
