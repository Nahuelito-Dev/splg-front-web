import { privateAxiosInstance } from './axiosConfig';
import { Delivery } from '../../interfaces';

// GET ALL
// 👇 Se eliminó "term?: string" de los argumentos
export const getAllDeliveries = async (page = 0, limit = 10) => {
  const offset = limit * page;
  let url = `/delivery?limit=${limit}&offset=${offset}`;

  try {
    const { data } = await privateAxiosInstance.get(url);
    // Asumimos que data es un array directo como en customers
    return {
      rows: Array.isArray(data) ? data : [],
      total: 100,
    };
  } catch (error) {
    console.error('❌ [GET DELIVERIES]', error);
    throw error;
  }
};

// GET ONE
export const getDeliveryById = async (id: string) => {
  const { data } = await privateAxiosInstance.get<Delivery>(`/delivery/${id}`);
  return data;
};

// CREATE (Endpoint especial en UsersController)
export const createDelivery = async (payload: any) => {
  const { data } = await privateAxiosInstance.post(
    '/users/delivery-registration',
    payload,
  );
  return data;
};

// UPDATE (Datos operativos del delivery)
export const updateDelivery = async (
  id: string,
  payload: Partial<Delivery>,
) => {
  const { data } = await privateAxiosInstance.patch(`/delivery/${id}`, payload);
  return data;
};

// DELETE
export const deleteDelivery = async (id: string) => {
  const { data } = await privateAxiosInstance.delete(`/delivery/${id}`);
  return data;
};

// TOGGLE STATUS
export const toggleDeliveryStatus = async (id: string, isActive: boolean) => {
  const { data } = await privateAxiosInstance.patch(`/delivery/${id}/status`, {
    isActive,
  });
  return data;
};
