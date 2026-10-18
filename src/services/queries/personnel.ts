import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveLeave,
  cancelLeave,
  correctAttendance,
  createLeave,
  getEmployeeDocuments,
  getPersonnelDashboard,
  getVacationBalance,
  listAttendance,
  listLeaves,
  registerAttendance,
  rejectLeave,
  updateLeave,
  type AttendanceFilters,
  type LeaveFilters,
} from '../api/personnel';
import type { PageParams } from '../api/httpClient';
import type {
  CorrectAttendanceBody,
  CreateLeaveBody,
  RegisterAttendanceBody,
  RejectLeaveBody,
  UpdateLeaveBody,
} from '../api/types';
import { queryKeys } from './queryKeys';

/** La documentación de un empleado: sus tarjetas, si queda inhabilitado y qué planes le faltan (CU-187). */
export const useEmployeeDocuments = (employeeId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.employees.detail(`documents:${employeeId}`),
    queryFn: () => getEmployeeDocuments(employeeId ?? ''),
    enabled: Boolean(employeeId) && enabled,
  });

/** El tablero de personal (CU-194). `enabled` en `false` lo apaga (un administrador general sin «Ver como»). */
export const usePersonnelDashboard = (enabled = true) =>
  useQuery({ queryKey: queryKeys.personnel.all, queryFn: getPersonnelDashboard, enabled });

/** La grilla de asistencia (CU-314). */
export const useAttendance = (params: PageParams, filters: AttendanceFilters, enabled = true) =>
  useQuery({
    queryKey: queryKeys.attendance.list({ ...params, ...filters }),
    queryFn: () => listAttendance(params, filters),
    enabled,
    placeholderData: keepPreviousData,
  });

/** Cargar o corregir una jornada cambia la grilla, las cifras del tablero y la ficha del empleado. */
const useRefreshAttendance = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [queryKeys.attendance, queryKeys.personnel].map((resource) =>
        queryClient.invalidateQueries({ queryKey: resource.all }),
      ),
    );
};

export const useRegisterAttendance = () => {
  const refresh = useRefreshAttendance();
  return useMutation({
    mutationFn: ({ employeeId, body }: { employeeId: string; body: RegisterAttendanceBody }) =>
      registerAttendance(employeeId, body),
    onSuccess: refresh,
  });
};

export const useCorrectAttendance = () => {
  const refresh = useRefreshAttendance();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CorrectAttendanceBody }) => correctAttendance(id, body),
    onSuccess: refresh,
  });
};

/** Las licencias (CU-319): la bandeja de pendientes y la lista de un empleado. */
export const useLeaves = (params: PageParams, filters: LeaveFilters, enabled = true) =>
  useQuery({
    queryKey: queryKeys.leaves.list({ ...params, ...filters }),
    queryFn: () => listLeaves(params, filters),
    enabled,
    placeholderData: keepPreviousData,
  });

/** El saldo de vacaciones de un empleado (CU-193). */
export const useVacationBalance = (employeeId: string | undefined, year?: number, enabled = true) =>
  useQuery({
    queryKey: queryKeys.leaves.detail(`balance:${employeeId}:${year ?? ''}`),
    queryFn: () => getVacationBalance(employeeId ?? '', year),
    enabled: Boolean(employeeId) && enabled,
  });

/**
 * Toda decisión sobre una licencia cambia la lista, el saldo de vacaciones, el tablero y la habilitación del
 * chofer (la documentación del empleado).
 */
const useRefreshLeaves = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [queryKeys.leaves, queryKeys.personnel, queryKeys.employees].map((resource) =>
        queryClient.invalidateQueries({ queryKey: resource.all }),
      ),
    );
};

export const useCreateLeave = () => {
  const refresh = useRefreshLeaves();
  return useMutation({
    mutationFn: ({ employeeId, body }: { employeeId: string; body: CreateLeaveBody }) => createLeave(employeeId, body),
    onSuccess: refresh,
  });
};

export const useUpdateLeave = () => {
  const refresh = useRefreshLeaves();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLeaveBody }) => updateLeave(id, body),
    onSuccess: refresh,
  });
};

export const useApproveLeave = () => {
  const refresh = useRefreshLeaves();
  return useMutation({ mutationFn: (id: string) => approveLeave(id), onSuccess: refresh });
};

export const useRejectLeave = () => {
  const refresh = useRefreshLeaves();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RejectLeaveBody }) => rejectLeave(id, body),
    onSuccess: refresh,
  });
};

export const useCancelLeave = () => {
  const refresh = useRefreshLeaves();
  return useMutation({ mutationFn: (id: string) => cancelLeave(id), onSuccess: refresh });
};
