import { http, type Page, type PageParams } from './httpClient';
import type {
  Attendance,
  AttendancePage,
  CorrectAttendanceBody,
  CreateLeaveBody,
  EmployeeDocuments,
  Leave,
  LeavePage,
  PersonnelDashboard,
  RegisterAttendanceBody,
  RejectLeaveBody,
  UpdateLeaveBody,
  VacationBalance,
} from './types';

/** GET /employees/:id/documents (CU-187): tarjetas de documentación, si está inhabilitado y qué le falta. */
export const getEmployeeDocuments = async (employeeId: string): Promise<EmployeeDocuments> => {
  const { data } = await http.get<EmployeeDocuments>(`/employees/${employeeId}/documents`);
  return data;
};

/** GET /personnel/dashboard (CU-194): las cifras de «Personal hoy». */
export const getPersonnelDashboard = async (): Promise<PersonnelDashboard> => {
  const { data } = await http.get<PersonnelDashboard>('/personnel/dashboard');
  return data;
};

/** Filtros de GET /attendance (CU-314). Sin ninguno, la API trae el día de hoy. */
export interface AttendanceFilters {
  date?: string;
  from?: string;
  to?: string;
  employeeId?: string;
  open?: boolean;
}

/** La grilla de asistencia con los contadores de presentes hoy y de jornadas rezagadas sin cerrar. */
export interface AttendanceList extends Page<Attendance> {
  presentToday: number;
  staleOpen: number;
}

/** GET /attendance (CU-314): jornadas paginadas (`page` desde 1 en la API). */
export const listAttendance = async (params: PageParams, filters: AttendanceFilters): Promise<AttendanceList> => {
  const { data } = await http.get<AttendancePage>('/attendance', {
    params: { page: params.page + 1, limit: params.pageSize, ...filters },
  });
  return { rows: data.data, total: data.total, presentToday: data.presentToday, staleOpen: data.staleOpen };
};

/** POST /employees/:id/attendance (CU-189): carga manual de una jornada. */
export const registerAttendance = async (employeeId: string, body: RegisterAttendanceBody): Promise<Attendance> => {
  const { data } = await http.post<Attendance>(`/employees/${employeeId}/attendance`, body);
  return data;
};

/** PATCH /attendance/:id (CU-313): corrige el ingreso o el egreso; la nota es obligatoria. */
export const correctAttendance = async (id: string, body: CorrectAttendanceBody): Promise<Attendance> => {
  const { data } = await http.patch<Attendance>(`/attendance/${id}`, body);
  return data;
};

/** Filtros de GET /leaves (CU-319). */
export interface LeaveFilters {
  status?: Leave['status'];
  type?: Leave['type'];
  employeeId?: string;
  from?: string;
  to?: string;
}

/** GET /leaves (CU-319): licencias paginadas; la bandeja de pendientes es `status: 'requested'`. */
export const listLeaves = async (params: PageParams, filters: LeaveFilters): Promise<Page<Leave>> => {
  const { data } = await http.get<LeavePage>('/leaves', {
    params: { page: params.page + 1, limit: params.pageSize, ...filters },
  });
  return { rows: data.data, total: data.total };
};

/** POST /employees/:id/leaves (CU-191): nace solicitada. */
export const createLeave = async (employeeId: string, body: CreateLeaveBody): Promise<Leave> => {
  const { data } = await http.post<Leave>(`/employees/${employeeId}/leaves`, body);
  return data;
};

/** PATCH /leaves/:id (CU-316): sólo una licencia solicitada. */
export const updateLeave = async (id: string, body: UpdateLeaveBody): Promise<Leave> => {
  const { data } = await http.patch<Leave>(`/leaves/${id}`, body);
  return data;
};

/** PATCH /leaves/:id/approve (CU-192) */
export const approveLeave = async (id: string): Promise<Leave> => {
  const { data } = await http.patch<Leave>(`/leaves/${id}/approve`);
  return data;
};

/** PATCH /leaves/:id/reject (CU-318): el motivo es obligatorio. */
export const rejectLeave = async (id: string, body: RejectLeaveBody): Promise<Leave> => {
  const { data } = await http.patch<Leave>(`/leaves/${id}/reject`, body);
  return data;
};

/** PATCH /leaves/:id/cancel (CU-317) */
export const cancelLeave = async (id: string): Promise<Leave> => {
  const { data } = await http.patch<Leave>(`/leaves/${id}/cancel`);
  return data;
};

/** GET /employees/:id/vacation-balance (CU-193): sin año, el actual. */
export const getVacationBalance = async (employeeId: string, year?: number): Promise<VacationBalance> => {
  const { data } = await http.get<VacationBalance>(`/employees/${employeeId}/vacation-balance`, {
    params: { year },
  });
  return data;
};
