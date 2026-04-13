import { privateAxiosInstance } from './axiosConfig';
import { Customer } from '../../interfaces'; // Asegúrate de tener o crear esta interfaz

// GET ALL (Con soporte para paginación y búsqueda si el back lo agrega después)
export const getAllCustomers = async (page = 0, limit = 10, term?: string) => {
  const offset = limit * page;
  let url = `/customers?limit=${limit}&offset=${offset}`;

  // Nota: Tu backend actual de CustomersService.findAll aún no filtra por 'term',
  // pero lo dejamos preparado en el front para cuando lo agregues.
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
  } catch (error: any) {
    console.error('❌ [GET CUSTOMERS] Error:', error);
    throw error;
  }
};

// GET BY ID
export const getCustomerById = async (id: string) => {
  const { data } = await privateAxiosInstance.get<Customer>(`/customers/${id}`);
  return data;
};

// UPDATE
export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  const { data: response } = await privateAxiosInstance.patch(
    `/customers/${id}`,
    data,
  );
  return response;
};

// DELETE
export const deleteCustomer = async (id: string) => {
  const { data } = await privateAxiosInstance.delete(`/customers/${id}`);
  return data;
};

// VALIDATE (Endpoint específico de tu controller)
export const validateCustomer = async (id: string) => {
  const { data } = await privateAxiosInstance.patch(
    `/customers/${id}/validate`,
  );
  return data;
};
// CREATE (Endpoint especial en UsersController que maneja Firebase + DB)
export const createCustomer = async (payload: any) => {
  const { data } = await privateAxiosInstance.post(
    '/users/customer-registration-admin',
    payload,
  );
  return data;
};
