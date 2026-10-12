import { ApiError, toApiError } from './errors';
import { http, type Page, type PageParams } from './httpClient';
import type {
  Employee,
  TerminateEmployeeBody,
  EmployeeListItem,
  EmployeePage,
  GrantEmployeeAccountBody,
  JobPosition,
  Message,
  ReinstateEmployeeBody,
  CreateJobPositionBody,
  UpdateEmployeeBody,
  UpdateJobPositionBody,
} from './types';

/** Filtros de GET /employees. */
export interface EmployeeFilters {
  q?: string;
  positionId?: string;
  category?: JobPosition['category'];
  status?: Employee['status'];
  hasAccount?: boolean;
}

/**
 * Cuerpo de alta y edición del legajo. El Swagger tipa los opcionales de texto como `object`, así que los campos
 * de texto se redeclaran como `string | null` (el back convierte el vacío en nulo).
 */
type OptionalText =
  | 'addressLine'
  | 'city'
  | 'province'
  | 'postalCode'
  | 'phone'
  | 'personalEmail'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'emergencyContactRelationship'
  | 'bankCbu'
  | 'notes'
  | 'cuil'
  | 'birthDate';
export type EmployeeBody = Omit<UpdateEmployeeBody, OptionalText> & Partial<Record<OptionalText, string | null>>;

/** GET /employees: legajos de la distribuidora, paginados (`page` desde 1). */
export const listEmployees = async (params: PageParams, filters: EmployeeFilters): Promise<Page<EmployeeListItem>> => {
  const { data } = await http.get<EmployeePage>('/employees', {
    params: { page: params.page + 1, limit: params.pageSize, ...filters },
  });
  return { rows: data.data, total: data.total };
};

/** GET /employees/:id: el legajo completo. */
export const getEmployee = async (id: string): Promise<Employee> => {
  const { data } = await http.get<Employee>(`/employees/${id}`);
  return data;
};

/** POST /employees: alta del legajo. */
export const createEmployee = async (body: EmployeeBody): Promise<Employee> => {
  const { data } = await http.post<Employee>('/employees', body);
  return data;
};

/** PATCH /employees/:id: modifica el legajo. */
export const updateEmployee = async (id: string, body: EmployeeBody): Promise<Employee> => {
  const { data } = await http.patch<Employee>(`/employees/${id}`, body);
  return data;
};

/** DELETE /employees/:id: sólo un legajo dado de alta por error (409 si corresponde el egreso). */
export const deleteEmployee = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/employees/${id}`);
  return data;
};

/** POST /employees/:id/termination (CU-181): bloquea la cuenta, deshabilita al chofer y libera su vehículo. */
export const terminateEmployee = async (id: string, body: TerminateEmployeeBody): Promise<Employee> => {
  const { data } = await http.post<Employee>(`/employees/${id}/termination`, body);
  return data;
};

/** POST /employees/:id/reinstatement: reabre un legajo egresado. */
export const reinstateEmployee = async (id: string, body: ReinstateEmployeeBody): Promise<Employee> => {
  const { data } = await http.post<Employee>(`/employees/${id}/reinstatement`, body);
  return data;
};

/** POST /employees/:id/account: crea la cuenta de acceso del legajo si su puesto lo permite. */
export const grantEmployeeAccount = async (id: string, body: GrantEmployeeAccountBody): Promise<Employee> => {
  const { data } = await http.post<Employee>(`/employees/${id}/account`, body);
  return data;
};

/** GET /job-positions: los puestos de la distribuidora. */
export const listJobPositions = async (): Promise<JobPosition[]> => {
  const { data } = await http.get<JobPosition[]>('/job-positions');
  return data;
};

/**
 * El 409 del back nombra campos (`isActive=false`) y dice «eliminar» donde el panel dice «dar de baja»: se traduce a
 * lo que el usuario puede hacer. Lo que no se reconoce pasa tal cual.
 */
export const friendlyPositionError = (error: unknown): never => {
  const api = toApiError(error);
  if (api.status !== 409) throw error;
  const message = api.messages[0] ?? '';
  const translated = (): string => {
    const active = /lo ocupan (\d+) empleado/.exec(message);
    if (active) return `El puesto lo ocupan ${active[1]} persona(s) activa(s): reasignalas a otro puesto antes.`;
    if (/figura en \d+ legajo/.test(message))
      return 'El puesto figura en legajos, también de personal egresado: no se puede eliminar. Dalo de baja para que deje de ofrecerse.';
    if (/último puesto activo/.test(message))
      return 'Es el último puesto activo de su categoría: creá otro antes de darlo de baja, cambiarle la categoría o eliminarlo.';
    if (/cuenta cuyo rol no corresponde/.test(message))
      return 'Hay personal con cuenta de acceso cuyo rol no corresponde a la nueva categoría.';
    if (/Ya existe un puesto llamado/.test(message)) return 'Ya existe un puesto con ese nombre.';
    return message;
  };
  throw new ApiError(409, [translated()]);
};

/** POST /job-positions */
export const createJobPosition = async (body: CreateJobPositionBody): Promise<JobPosition> => {
  const { data } = await http.post<JobPosition>('/job-positions', body).catch(friendlyPositionError);
  return data;
};

/** PATCH /job-positions/:id */
export const updateJobPosition = async (id: string, body: UpdateJobPositionBody): Promise<JobPosition> => {
  const { data } = await http.patch<JobPosition>(`/job-positions/${id}`, body).catch(friendlyPositionError);
  return data;
};

/** DELETE /job-positions/:id */
export const deleteJobPosition = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/job-positions/${id}`).catch(friendlyPositionError);
  return data;
};
