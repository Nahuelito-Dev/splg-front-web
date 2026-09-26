import { privateAxiosInstance } from './axiosConfig';
import { User } from '../../interfaces';

export type RolRegistrable = 'customer' | 'delivery' | 'admin' | 'super_admin';

/**
 * Alta de un usuario de cualquier rol: POST /users. El backend decide si quien
 * pide puede crear ese rol y en qué distribuidora (un admin, sólo en la suya).
 */
export interface AltaDeUsuario {
  rol: RolRegistrable;
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  /** Sólo el super admin elige distribuidora; un admin crea en la suya. */
  distributorId?: string;
  validated?: boolean;
  isActive?: boolean;
}

/**
 * Se manda sólo lo que el alta acepta: el backend rechaza cualquier campo de
 * más, y los formularios traen otros (confirmación de contraseña, etc.).
 */
export const registrarUsuario = async (alta: AltaDeUsuario) => {
  const cuerpo: AltaDeUsuario = {
    rol: alta.rol,
    email: alta.email,
    password: alta.password,
    full_name: alta.full_name,
    phone_number: alta.phone_number,
  };
  if (alta.distributorId) cuerpo.distributorId = alta.distributorId;
  if (alta.validated !== undefined) cuerpo.validated = alta.validated;
  if (alta.isActive !== undefined) cuerpo.isActive = alta.isActive;
  const { data } = await privateAxiosInstance.post<User>('/users', cuerpo);
  return data;
};
