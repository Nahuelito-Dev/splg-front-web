import { privateAxiosInstance } from './axiosConfig';
import { Delivery } from '../../interfaces';

// GET ALL
export const getAllDeliveries = async (page = 0, limit = 10, term?: string) => {
  const offset = limit * page;
  let url = `/delivery?limit=${limit}&offset=${offset}`;

  if (term) {
    url += `&term=${term}`;
  }

  try {
    const { data } = await privateAxiosInstance.get(url);
    
    if (data && !Array.isArray(data) && data.rows !== undefined) {
      return {
        rows: data.rows,
        total: data.total || 0,
      };
    }

    return {
      rows: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 100,
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
