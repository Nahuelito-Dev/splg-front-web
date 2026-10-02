import { z } from 'zod';
import { accountFields } from '../../../common/forms/accountSchema';

/** "Mi cuenta": nombre y teléfono, con las mismas reglas que el alta. */
export const profileSchema = z.object(accountFields);
export type ProfileValues = z.infer<typeof profileSchema>;

/** El correo nuevo tiene que ser válido y distinto del actual (sin importar mayúsculas). */
export const changeEmailSchema = (currentEmail: string) =>
  z.object({
    newEmail: z
      .string()
      .trim()
      .email('Email inválido')
      .refine((value) => value.toLowerCase() !== currentEmail.toLowerCase(), 'Es el mismo correo que ya usás'),
    /** Sólo se pide cuando la sesión necesita revalidarse. */
    password: z.string().optional(),
  });
export type ChangeEmailValues = z.infer<ReturnType<typeof changeEmailSchema>>;
