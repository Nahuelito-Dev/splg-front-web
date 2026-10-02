import { http } from './httpClient';
import type { CreateTimeSlotBody, SlotAvailability, TimeSlot } from './types';

/** Franjas horarias de entrega (`/time-slot`) y su disponibilidad por día. */

/** GET /time-slot: las franjas activas de la distribuidora. */
export const listTimeSlots = async (): Promise<TimeSlot[]> => {
  const { data } = await http.get<TimeSlot[]>('/time-slot');
  return data;
};

/** GET /time-slot/:id: una franja puntual (404 si no existe o es de otra distribuidora). */
export const getTimeSlot = async (id: string): Promise<TimeSlot> => {
  const { data } = await http.get<TimeSlot>(`/time-slot/${id}`);
  return data;
};

/** POST /time-slot */
export const createTimeSlot = async (body: CreateTimeSlotBody): Promise<TimeSlot> => {
  const { data } = await http.post<TimeSlot>('/time-slot', body);
  return data;
};

/** DELETE /time-slot/:id: baja lógica (deja de ofrecerse para agendar). */
export const deleteTimeSlot = async (id: string): Promise<TimeSlot> => {
  const { data } = await http.delete<TimeSlot>(`/time-slot/${id}`);
  return data;
};

/** GET /time-slot/availability?date=YYYY-MM-DD: cupos por franja para esa fecha. */
export const getTimeSlotAvailability = async (date: string): Promise<SlotAvailability[]> => {
  const { data } = await http.get<SlotAvailability[]>('/time-slot/availability', { params: { date } });
  return data;
};
