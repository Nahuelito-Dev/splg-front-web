import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTimeSlot, deleteTimeSlot, getTimeSlot, getTimeSlotAvailability, listTimeSlots } from '../api/timeSlots';
import type { CreateTimeSlotBody, SlotAvailability } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.timeSlots;

export const useTimeSlots = () =>
  useQuery({
    queryKey: keys.list(),
    queryFn: listTimeSlots,
  });

export const useTimeSlot = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getTimeSlot(id ?? ''),
    enabled: Boolean(id),
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

/** Cupos por franja de varios días a la vez (la semana del calendario); una consulta por día, con la misma clave que `useTimeSlotAvailability`. */
export const useTimeSlotAvailabilityByDay = (dates: string[], enabled = true) => {
  const results = useQueries({
    queries: dates.map((date) => ({
      queryKey: [...keys.all, 'availability', date],
      queryFn: () => getTimeSlotAvailability(date),
      enabled,
    })),
  });
  const byDay = new Map<string, SlotAvailability[]>();
  dates.forEach((date, index) => {
    const data = results[index]?.data;
    if (data) byDay.set(date, data);
  });
  return { byDay, isPending: results.some((r) => r.isPending && r.fetchStatus !== 'idle') };
};
