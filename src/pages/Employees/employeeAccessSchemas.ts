import { z } from 'zod';

/** `ReinstateEmployeeDto`: la fecha de ingreso nueva es opcional (si falta, el back usa hoy). */
export const reinstateSchema = z.object({ hireDate: z.string() });
export type ReinstateFormValues = z.infer<typeof reinstateSchema>;

/** `GrantEmployeeAccountDto`: correo, contraseña de 6 o más y teléfono E.164 opcional (si falta se usa el del legajo). */
export const grantAccountSchema = z.object({
  email: z.string().trim().min(1, 'Ingresá el correo').email('Correo inválido'),
  password: z.string().min(6, 'Al menos 6 caracteres'),
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\+[1-9]\d{7,14}$/.test(value), 'Usá el formato internacional: +5493764000000'),
});
export type GrantAccountFormValues = z.infer<typeof grantAccountSchema>;

export const grantAccountBody = (values: GrantAccountFormValues) => ({
  email: values.email,
  password: values.password,
  ...(values.phoneNumber ? { phoneNumber: values.phoneNumber } : {}),
});

/** `CreateJobPositionDto`: el nombre es libre (2 a 80); la categoría manda las reglas. */
export const jobPositionSchema = z.object({
  name: z.string().trim().min(2, 'Al menos 2 caracteres').max(80, 'No puede tener más de 80 caracteres'),
  category: z.enum(['driver', 'helper', 'warehouse', 'administration', 'sales', 'management', 'other'], {
    message: 'Elegí la categoría',
  }),
  isActive: z.boolean(),
});
export type JobPositionFormValues = z.infer<typeof jobPositionSchema>;
