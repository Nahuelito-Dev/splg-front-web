import type { PhotoKind } from '../../services/api/photos';
import type { Employee } from '../../services/api/types';

/**
 * Quién es el dueño de la foto del legajo. Con cuenta de acceso es la foto de perfil del usuario (el back responde
 * 409 en `/employees/:id/photo`); sin cuenta, la del propio legajo.
 */
export const employeePhotoOwner = (
  employee: Pick<Employee, 'employeeId' | 'hasAccount' | 'userId'>,
): { kind: Extract<PhotoKind, 'user' | 'employee'>; id: string } =>
  employee.hasAccount && employee.userId
    ? { kind: 'user', id: employee.userId }
    : { kind: 'employee', id: employee.employeeId };
