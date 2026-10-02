import { z } from 'zod';

/** Reglas del formulario de alta/edición de rol (CU-089, `CreateRoleDto`/`UpdateRoleDto`). */
export const roleSchema = z.object({
  type: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .regex(/^[a-z_]+$/, 'Sólo minúsculas y guión bajo, como "qa_pruebas"'),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
