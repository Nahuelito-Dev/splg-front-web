import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDispatchConfig,
  getScheduledTasksConfig,
  putDispatchConfig,
  putScheduledTasksConfig,
} from '../api/moduleConfig';
import type { DispatchConfigBody, ScheduledTasksConfigBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.moduleConfig;

interface Options {
  enabled?: boolean;
}

export const useDispatchConfig = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('dispatch'), queryFn: getDispatchConfig, enabled });

export const useUpdateDispatchConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DispatchConfigBody) => putDispatchConfig(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(keys.detail('dispatch'), saved);
    },
  });
};

export const useScheduledTasksConfig = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('scheduled_tasks'), queryFn: getScheduledTasksConfig, enabled });

export const useUpdateScheduledTasksConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduledTasksConfigBody) => putScheduledTasksConfig(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(keys.detail('scheduled_tasks'), saved);
    },
  });
};
