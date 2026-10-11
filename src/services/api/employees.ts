import { http, type Page, type PageParams } from './httpClient';
import type {
  Employee,
  TerminateEmployeeBody,
  EmployeeListItem,
  EmployeePage,
  JobPosition,
  Message,
  UpdateEmployeeBody,
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

/** GET /job-positions: los puestos de la distribuidora. */
export const listJobPositions = async (): Promise<JobPosition[]> => {
  const { data } = await http.get<JobPosition[]>('/job-positions');
  return data;
};
