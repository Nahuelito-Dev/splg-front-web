import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  listJobPositions,
  terminateEmployee,
  updateEmployee,
  type EmployeeBody,
  type EmployeeFilters,
} from '../api/employees';
import type { PageParams } from '../api/httpClient';
import type { TerminateEmployeeBody } from '../api/types';
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
