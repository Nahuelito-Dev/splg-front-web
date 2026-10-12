import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmployee,
  createJobPosition,
  deleteEmployee,
  deleteJobPosition,
  getEmployee,
  grantEmployeeAccount,
  listEmployees,
  listJobPositions,
  reinstateEmployee,
  terminateEmployee,
  updateEmployee,
  updateJobPosition,
  type EmployeeBody,
  type EmployeeFilters,
} from '../api/employees';
import type { PageParams } from '../api/httpClient';
import type {
  CreateJobPositionBody,
  GrantEmployeeAccountBody,
  ReinstateEmployeeBody,
  TerminateEmployeeBody,
  UpdateJobPositionBody,
} from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.employees;

export const useEmployees = (params: PageParams, filters: EmployeeFilters, enabled = true) =>
  useQuery({
    queryKey: keys.list({ ...params, ...filters }),
    queryFn: () => listEmployees(params, filters),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useEmployee = (id: string | undefined) =>
  useQuery({ queryKey: keys.detail(id ?? ''), queryFn: () => getEmployee(id ?? ''), enabled: Boolean(id) });

export const useJobPositions = (enabled = true) =>
  useQuery({ queryKey: queryKeys.jobPositions.all, queryFn: listJobPositions, enabled });

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EmployeeBody) => createEmployee(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EmployeeBody }) => updateEmployee(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useTerminateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TerminateEmployeeBody }) => terminateEmployee(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useReinstateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReinstateEmployeeBody }) => reinstateEmployee(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useGrantEmployeeAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: GrantEmployeeAccountBody }) => grantEmployeeAccount(id, body),
    // La cuenta nueva crea un usuario y el perfil de chofer: se refrescan los legajos, los choferes y los usuarios
    // (de ahí salen también los combos de «Abrir carga»).
    onSuccess: () =>
      Promise.all(
        [queryKeys.employees, queryKeys.deliveries, queryKeys.users].map((resource) =>
          queryClient.invalidateQueries({ queryKey: resource.all }),
        ),
      ),
  });
};

export const useCreateJobPosition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateJobPositionBody) => createJobPosition(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobPositions.all }),
  });
};

export const useUpdateJobPosition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateJobPositionBody }) => updateJobPosition(id, body),
    // Los legajos muestran el nombre y la categoría del puesto: renombrarlo los refresca.
    onSuccess: () =>
      Promise.all(
        [queryKeys.jobPositions, queryKeys.employees].map((resource) =>
          queryClient.invalidateQueries({ queryKey: resource.all }),
        ),
      ),
  });
};

export const useDeleteJobPosition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJobPosition(id),
    onSuccess: () =>
      Promise.all(
        [queryKeys.jobPositions, queryKeys.employees].map((resource) =>
          queryClient.invalidateQueries({ queryKey: resource.all }),
        ),
      ),
  });
};
