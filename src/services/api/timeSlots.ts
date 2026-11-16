import { http } from './httpClient';
import type { CreateTimeSlotBody, SlotAvailability, TimeSlot, UpdateTimeSlotBody } from './types';

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

/**
 * PATCH /time-slot/:id: edición parcial. 400 si el rango queda invertido; 409 si el cupo baja por debajo de lo
 * ya agendado. `isActive: true` reactiva una franja dada de baja.
 */
export const updateTimeSlot = async (id: string, body: UpdateTimeSlotBody): Promise<TimeSlot> => {
  const { data } = await http.patch<TimeSlot>(`/time-slot/${id}`, body);
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
