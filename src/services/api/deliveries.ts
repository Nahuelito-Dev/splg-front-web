import { privateAxiosInstance } from './axiosConfig';
import { Delivery } from '../../interfaces';
import { AltaDeUsuario, registrarUsuario } from './registro';

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

// CREATE: alta de un chofer (POST /users con rol delivery).
export const createDelivery = (
  payload: Omit<AltaDeUsuario, 'rol'>,
) => registrarUsuario({ ...payload, rol: 'delivery' });

// UPDATE (Datos operativos del delivery)
export const updateDelivery = async (
  id: string,
  payload: Pick<Partial<Delivery>, 'validated' | 'isActive'>,
) => {
  const cuerpo = {
    ...(payload.validated !== undefined && { validated: payload.validated }),
    ...(payload.isActive !== undefined && { isActive: payload.isActive }),
  };
  const { data } = await privateAxiosInstance.patch(`/delivery/${id}`, cuerpo);
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
