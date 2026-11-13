import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDispatchConfig,
  getExpressConfig,
  putExpressConfig,
  getScheduledTasksConfig,
  listProcessConfigs,
  putDispatchConfig,
  putProcessConfig,
  putScheduledTasksConfig,
  type ProcessConfigBody,
} from '../api/moduleConfig';
import type { DispatchConfigBody, ExpressConfigBody, ProcessConfig, ScheduledTasksConfigBody } from '../api/types';
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
    mutationFn: (body: Partial<DispatchConfigBody>) => putDispatchConfig(body),
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

export const useProcessConfigs = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.list({ kind: 'processes' }), queryFn: listProcessConfigs, enabled });

export const useUpdateProcessConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ process, body }: { process: string; body: ProcessConfigBody }) => putProcessConfig(process, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(keys.list({ kind: 'processes' }), (current: ProcessConfig[] | undefined) =>
        current?.map((p) => (p.process === saved.process ? saved : p)),
      );
    },
  });
};

export const useExpressConfig = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('express_dispatch'), queryFn: getExpressConfig, enabled });

export const useUpdateExpressConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpressConfigBody) => putExpressConfig(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(keys.detail('express_dispatch'), saved);
    },
  });
};
