import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTimeSlot, deleteTimeSlot, getTimeSlotAvailability, listTimeSlots } from '../api/timeSlots';
import type { CreateTimeSlotBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.timeSlots;

export const useTimeSlots = () =>
  useQuery({
    queryKey: keys.list(),
    queryFn: listTimeSlots,
  });

export const useTimeSlotAvailability = (date: string) =>
  useQuery({
    queryKey: [...keys.all, 'availability', date],
    queryFn: () => getTimeSlotAvailability(date),
    enabled: Boolean(date),
  });

export const useCreateTimeSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTimeSlotBody) => createTimeSlot(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteTimeSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTimeSlot(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
