import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  EmpresaScheduledTasksBody,
  DispatchConfig,
  DispatchConfigBody,
  ProcessConfig,
  ExpressConfig,
  ExpressConfigBody,
  ScheduledTasksConfig,
} from './types';

/** GET /module-config/dispatch: pasos de radio y ventana de aceptación de la oferta (CU-171). */
export const getDispatchConfig = async (): Promise<DispatchConfig> => {
  const { data } = await http.get<DispatchConfig>('/module-config/dispatch');
  return data;
};

/** PUT /module-config/dispatch: los campos que no se envían toman el valor por omisión (`{}` restablece todo). */
/** El PUT es parcial: lo que no se manda vuelve a su valor por omisión (el esquema marca obligatorio lo que tiene `default`). */
export const putDispatchConfig = async (body: Partial<DispatchConfigBody>): Promise<DispatchConfig> => {
  const { data } = await http.put<DispatchConfig>('/module-config/dispatch', body);
  return data;
};

/**
 * GET /module-config/scheduled_tasks: las frecuencias de las tareas programadas (sólo lectura para la empresa: las fija
 * la plataforma) y la hora del aviso de vencimientos de flota (CU-173).
 */
export const getScheduledTasksConfig = async (): Promise<ScheduledTasksConfig> => {
  const { data } = await http.get<ScheduledTasksConfig>('/module-config/scheduled_tasks');
  return data;
};

/**
 * PUT /v2/module-config/scheduled_tasks: la empresa cambia sólo la hora del aviso de flota y conserva las frecuencias
 * (una frecuencia en el cuerpo da 400 `SCHEDULED_TASKS_PLATFORM_ONLY`).
 */
export const putScheduledTasksConfig = async (body: EmpresaScheduledTasksBody): Promise<ScheduledTasksConfig> => {
  const { data } = await http.put<ScheduledTasksConfig>('/module-config/scheduled_tasks', body, {
    baseURL: env.apiUrlV2,
  });
  return data;
};

/** Cuerpo de `PUT /module-config/:proceso`: parámetro → valor. Cada proceso valida con su propio esquema. */
export type ProcessConfigBody = Record<string, number>;

/** GET /module-config/processes: los cinco procesos automáticos con su esquema y sus valores vigentes (CU-172). */
export const listProcessConfigs = async (): Promise<ProcessConfig[]> => {
  const { data } = await http.get<ProcessConfig[]>('/module-config/processes');
  return data;
};

/** PUT /module-config/:proceso: sólo se guarda lo que viene; lo demás toma el valor por omisión (`{}` restablece todo). */
export const putProcessConfig = async (process: string, body: ProcessConfigBody): Promise<ProcessConfig> => {
  const { data } = await http.put<ProcessConfig>(`/module-config/${process}`, body);
  return data;
};

/** GET /module-config/express_dispatch: recargo, radio, horario y tiempos de la compra express (CU-172). */
export const getExpressConfig = async (): Promise<ExpressConfig> => {
  const { data } = await http.get<ExpressConfig>('/module-config/express_dispatch');
  return data;
};

/** PUT /module-config/express_dispatch: reemplaza la configuración; lo que no se envía toma el valor por omisión. */
export const putExpressConfig = async (body: ExpressConfigBody): Promise<ExpressConfig> => {
  const { data } = await http.put<ExpressConfig>('/module-config/express_dispatch', body);
  return data;
};
