import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createIncident, listIncidents, resolveIncident, updateIncident } from '../api/incidents';
import type { CreateIncidentBody, ResolveIncidentBody, UpdateIncidentBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.incidents;

export const useIncidents = () => useQuery({ queryKey: keys.all, queryFn: listIncidents });

export const useCreateIncident = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateIncidentBody) => createIncident(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useResolveIncident = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResolveIncidentBody }) => resolveIncident(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateIncident = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateIncidentBody }) => updateIncident(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
