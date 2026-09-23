// services/api/auth.ts
import { privateAxiosInstance, publicAxiosInstance } from './axiosConfig';

export const checkToken = async () => {
  const response = await publicAxiosInstance.post('/users/validate');
  return response.status;
};

export const getAdmin = async (email: string) => {
  try {
    const { data } = await privateAxiosInstance.get(`/users/email/${email}`);

    // En tu backend, la relación se llama 'role' y el campo es 'type'
    const roleType = data.role?.type;

    if (roleType !== 'admin' && roleType !== 'super_admin') {
      throw new Error('No tienes permisos de administrador');
    }

    return {
      fullName: data.full_name,
      role: roleType,
      blocked: data.blocked || false,
    };
  } catch (error: any) {
    console.error('❌ Error validando admin:', error);
    throw error;
  }
};
