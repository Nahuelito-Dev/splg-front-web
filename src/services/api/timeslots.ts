import { privateAxiosInstance } from './axiosConfig';

export interface TimeSlot {
  time_slot_id: string; // Nombre exacto de tu DB
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
}

// Obtener todas las franjas activas
export const getAllTimeSlots = async () => {
  const { data } = await privateAxiosInstance.get<TimeSlot[]>('/time-slot');
  return data;
};

// Crear nueva franja
export const createTimeSlot = async (data: Partial<TimeSlot>) => {
  const { data: res } = await privateAxiosInstance.post('/time-slot', data);
  return res;
};

// Desactivar franja (Soft Delete)
export const deleteTimeSlot = async (id: string) => {
  await privateAxiosInstance.delete(`/time-slot/${id}`);
};
