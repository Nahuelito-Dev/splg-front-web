import { privateAxiosInstance } from './axiosConfig';
import { GasCylinder } from '../../interfaces';

// GET ALL
export const getAllCylinders = async (page = 0, limit = 10) => {
  const offset = limit * page;
  const url = `/gascylinder?limit=${limit}&offset=${offset}`;
  try {
    const { data } = await privateAxiosInstance.get(url);
    return {
      rows: data.gasCylinders || [],
      total: data.total || 0,
    };
  } catch (error: any) {
    console.error('❌ [GET CYLINDERS] Error:', error);
    throw error;
  }
};

// 1. UPDATE GENERAL (Actualiza TODO, incluido el Stock absoluto)
export const updateCylinder = async (
  id: string,
  data: Partial<GasCylinder>,
) => {
  const payload = {
    ...data,
    price: data.price ? Number(data.price) : undefined,
    weight: data.weight ? Number(data.weight) : undefined,
    stock: data.stock !== undefined ? Number(data.stock) : undefined, // <--- Importante
    // No enviamos promotions aquí si no se tocaron, o se envían tal cual
  };

  const { data: response } = await privateAxiosInstance.patch(
    `/gascylinder/${id}`,
    payload,
  );
  return response;
};

// 2. UPDATE STOCK (Suma o Resta cantidades)
export const updateCylinderStock = async (id: string, quantity: number) => {
  // Forzamos que sea un objeto JSON simple con un número
  const payload = {
    quantity: Number(quantity),
  };

  const { data } = await privateAxiosInstance.patch(
    `/gascylinder/${id}/stock`,
    payload,
  );
  return data;
};

// CREATE
export const createCylinder = async (data: Partial<GasCylinder>) => {
  const payload = {
    ...data,
    price: Number(data.price),
    weight: Number(data.weight),
    stock: Number(data.stock || 0),
    promotions: data.promotions || [],
  };
  const { data: response } = await privateAxiosInstance.post(
    '/gascylinder',
    payload,
  );
  return response;
};

// DELETE
export const deleteCylinder = async (id: string) => {
  const { data } = await privateAxiosInstance.delete(`/gascylinder/${id}`);
  return data;
};
