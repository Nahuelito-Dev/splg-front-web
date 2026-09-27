import { z } from 'zod';

/** Reglas del formulario de "Probar el correo" (`POST /email/test`). */
export const emailTestSchema = z.object({ email: z.string().trim().email('Ingresá un correo válido') });

export type EmailTestFormValues = z.infer<typeof emailTestSchema>;
