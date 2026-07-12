import { privateAxiosInstance } from './axiosConfig';

export interface Distributor {
  distributor_id: string;
  name: string;
  slug: string;
  legal_name?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  status: 'active' | 'suspended';
  plan?: string;
  createdAt?: string;
}

// LISTAR todas las distribuidoras (solo super_admin)
export const getAllDistributors = async () => {
  const { data } = await privateAxiosInstance.get<Distributor[]>('/distributor');
  return data;
};

// CREAR una distribuidora
export const createDistributor = async (payload: Partial<Distributor>) => {
  const { data } = await privateAxiosInstance.post('/distributor', payload);
  return data;
};

// ACTUALIZAR
export const updateDistributor = async (
  id: string,
  payload: Partial<Distributor>,
) => {
  const { data } = await privateAxiosInstance.patch(`/distributor/${id}`, payload);
  return data;
};

// ELIMINAR (soft)
export const deleteDistributor = async (id: string) => {
  const { data } = await privateAxiosInstance.delete(`/distributor/${id}`);
  return data;
};
