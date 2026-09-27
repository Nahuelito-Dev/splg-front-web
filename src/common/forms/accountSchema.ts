import { z } from 'zod';

/**
 * Reglas de los datos de cuenta, las mismas que valida la API en el alta
 * (RegistrarClienteDto): se chequean antes de enviar para no depender del 400.
 * Las comparten los formularios de clientes, choferes y administradores.
 */
const E164 = /^\+[1-9]\d{7,14}$/;

export const accountFields = {
  full_name: z.string().trim().min(2, 'Ingresá el nombre completo'),
  phone_number: z.string().trim().regex(E164, 'Formato internacional, por ejemplo +5493764000000'),
};

export const newPassword = z.string().min(6, 'Mínimo 6 caracteres');

/** Alta: cuenta completa con confirmación de contraseña. */
export const newAccountSchema = z
  .object({
    ...accountFields,
    email: z.string().trim().email('Email inválido'),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type NewAccountValues = z.infer<typeof newAccountSchema>;
