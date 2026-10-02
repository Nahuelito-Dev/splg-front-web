import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { checkUserExists } from '../../services/api/users';

/**
 * Antes de un alta: POST /users/check-exists. Marca en el formulario el correo
 * o el teléfono que ya tienen cuenta y devuelve `false` para frenar el envío.
 * Si la consulta falla no bloquea: el alta real valida igual.
 */
export const checkAccountFree = async <T extends FieldValues>(
  values: { email: string; phone_number: string },
  setError: UseFormSetError<T>,
): Promise<boolean> => {
  try {
    // La API compara el correo distinguiendo mayúsculas: se consulta en minúsculas, como lo guarda Firebase.
    const found = await checkUserExists({
      email: values.email.trim().toLowerCase(),
      phoneNumber: values.phone_number.trim(),
    });
    if (found.email) setError('email' as Path<T>, { message: 'Ya existe una cuenta con ese email' });
    if (found.phoneNumber) setError('phone_number' as Path<T>, { message: 'Ya existe una cuenta con ese teléfono' });
    return !found.email && !found.phoneNumber;
  } catch {
    return true;
  }
};
