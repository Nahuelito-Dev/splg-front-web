import { http } from './httpClient';
import type {
  DispatchConfig,
  DispatchConfigBody,
  ProcessConfig,
  ScheduledTasksConfig,
  ScheduledTasksConfigBody,
} from './types';

/** GET /module-config/dispatch: pasos de radio y ventana de aceptación de la oferta (CU-171). */
export const getDispatchConfig = async (): Promise<DispatchConfig> => {
  const { data } = await http.get<DispatchConfig>('/module-config/dispatch');
  return data;
};

/** PUT /module-config/dispatch: los campos que no se envían toman el valor por omisión (`{}` restablece todo). */
export const putDispatchConfig = async (body: DispatchConfigBody): Promise<DispatchConfig> => {
  const { data } = await http.put<DispatchConfig>('/module-config/dispatch', body);
  return data;
};

/** GET /module-config/scheduled_tasks: intervalo de cada tarea programada (CU-173). */
export const getScheduledTasksConfig = async (): Promise<ScheduledTasksConfig> => {
  const { data } = await http.get<ScheduledTasksConfig>('/module-config/scheduled_tasks');
  return data;
};

/** PUT /module-config/scheduled_tasks: los campos que no se envían toman el valor por omisión (`{}` restablece todo). */
export const putScheduledTasksConfig = async (body: ScheduledTasksConfigBody): Promise<ScheduledTasksConfig> => {
  const { data } = await http.put<ScheduledTasksConfig>('/module-config/scheduled_tasks', body);
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
