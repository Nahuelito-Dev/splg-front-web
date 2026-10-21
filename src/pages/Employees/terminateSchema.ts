import { z } from 'zod';

/** El back rechaza (400) un egreso anterior al ingreso del legajo. */
export const terminateSchema = (hireDate: string) =>
  z.object({
    terminationDate: z
      .string()
      .min(1, 'Ingresá la fecha de egreso')
      .refine((value) => !hireDate || value >= hireDate.slice(0, 10), 'El egreso no puede ser anterior al ingreso'),
    reason: z.enum(['resignation', 'dismissal', 'end_of_contract', 'retirement', 'other']),
  });

export type TerminateValues = z.infer<ReturnType<typeof terminateSchema>>;
