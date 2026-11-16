import { z } from 'zod';
import { accountFields, newPassword } from '../../common/forms/accountSchema';

/** Edición: la cuenta (nombre, teléfono, contraseña opcional) y lo operativo. */
export const deliveryEditSchema = z
  .object({
    ...accountFields,
    password: z.union([z.literal(''), newPassword]),
    confirmPassword: z.string(),
    validated: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type DeliveryEditValues = z.infer<typeof deliveryEditSchema>;

/** Alta: cuenta completa con confirmación de contraseña, más la distribuidora (sólo la usa el administrador general). */
export const deliveryCreateSchema = z
  .object({
    ...accountFields,
    email: z.string().trim().email('Email inválido'),
    password: newPassword,
    confirmPassword: z.string(),
    distributorId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type DeliveryCreateValues = z.infer<typeof deliveryCreateSchema>;
