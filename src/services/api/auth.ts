// services/api/auth.ts
import { publicAxiosInstance } from './axiosConfig';

export const checkToken = async () => {
  const response = await publicAxiosInstance.post('/users/validate');
  return response.status;
};

export const getAdmin = async (email: string) => {
  try {
    // CAMBIO: La ruta correcta según tu Controller es /users/email/
    const { data } = await publicAxiosInstance.get(`/users/email/${email}`);

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
