// services/api/users.ts
import { privateAxiosInstance } from './axiosConfig';
import { User } from '../../interfaces';

export const getAllUsers = async (page = 0, limit = 10, term?: string) => {
  const offset = limit * page;

  // Si mandas 'term', lo metemos en la URL.
  // Si el Backend deployado es viejo, simplemente va a ignorar este parámetro extra y no pasa nada.
  let url = `/users?limit=${limit}&offset=${offset}`;

  if (term) {
    url += `&term=${term}`;
  }

  console.log('📡 Fetching:', url);

  try {
    const { data } = await privateAxiosInstance.get(url);

    return {
      users: data.users || [],
      maxUsers: data.maxUsers || 0,
    };
  } catch (error: any) {
    console.error('❌ [GET ALL USERS] Error:', error);
    throw error;
  }
};

interface UserWithPassword extends Partial<User> {
  password: string;
}

export const createUser = async (newUser: UserWithPassword) => {
  const { data } = await privateAxiosInstance.post<User>('/users', newUser);
  return data;
};

// DELETE Físico
export const deleteUser = async (user_id: string) => {
  // Pasamos el ID directamente
  const { data } = await privateAxiosInstance.delete(`/users/${user_id}`);
  return data;
};

// UPDATE
export const updateUser = async (
  user_id: string,
  updateData: Partial<User>,
) => {
  const { data } = await privateAxiosInstance.patch<User>(
    `/users/${user_id}`,
    updateData,
  );
  return data;
};
// Añade esta función para obtener usuario por email (reemplaza getAdmin)
export const getUserByEmail = async (email: string) => {
  try {
    console.log(`🔍 [GET USER BY EMAIL] Buscando: ${email}`);
    const { data } = await privateAxiosInstance.get(`/users/email/${email}`);
    console.log('✅ [GET USER BY EMAIL] Response:', data);
    return data;
  } catch (error: any) {
    console.error('❌ [GET USER BY EMAIL] Error:', error);
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
// services/api/users.ts - agregar esta función
export const getUserById = async (userId: string) => {
  try {
    console.log(`🔍 [GET USER BY ID] Buscando: ${userId}`);
    const { data } = await privateAxiosInstance.get(`/users/${userId}`);
    console.log('✅ [GET USER BY ID] Response:', data);
    return data;
  } catch (error: any) {
    console.error('❌ [GET USER BY ID] Error:', error);
    if (error.response?.status === 404) {
      throw new Error('Usuario no encontrado');
    }
    throw error;
  }
};