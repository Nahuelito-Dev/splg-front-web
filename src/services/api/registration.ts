import { http } from './httpClient';
import type { RegistrarUsuarioBody, User } from './types';

type Role = RegistrarUsuarioBody['rol'];
type RegistrationData = Omit<RegistrarUsuarioBody, 'rol'>;

/**
 * Alta de un usuario de cualquier rol: POST /users. La API decide si quien pide
 * puede crear ese rol y en qué distribuidora (un admin, sólo en la suya).
 *
 * Se copian sólo los campos del DTO: la API rechaza cualquier campo de más, y
 * los formularios traen otros (confirmación de contraseña, etc.).
 */
export const registerUser = async (role: Role, data: RegistrationData): Promise<User> => {
  const body: RegistrarUsuarioBody = {
    rol: role,
    email: data.email,
    password: data.password,
    full_name: data.full_name,
    phone_number: data.phone_number,
    ...(data.distributorId !== undefined && { distributorId: data.distributorId }),
    ...(data.validated !== undefined && { validated: data.validated }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
  };
  const { data: user } = await http.post<User>('/users', body);
  return user;
};

/** Los datos de cuenta que piden todos los formularios de alta. */
export type AccountFields = Pick<RegistrarUsuarioBody, 'email' | 'password' | 'full_name' | 'phone_number'>;
