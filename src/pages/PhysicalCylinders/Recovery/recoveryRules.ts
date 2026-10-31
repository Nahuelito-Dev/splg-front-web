import { z } from 'zod';
import type { ResolveRecoveryBody } from '../../../services/api/recovery';

export const NOTE_MIN = 10;
export const NOTE_MAX = 500;

/** La decisión del administrador sobre un caso: qué decide y por qué (la nota es obligatoria). */
export const resolveSchema = z.object({
  decision: z.enum(['charge_deposit', 'write_off', 'close_no_charge'], {
    errorMap: () => ({ message: 'Elegí qué decidís' }),
  }),
  note: z
    .string()
    .trim()
    .min(NOTE_MIN, `Escribí el motivo de la decisión (al menos ${NOTE_MIN} caracteres)`)
    .max(NOTE_MAX, `Hasta ${NOTE_MAX} caracteres`),
});

export type ResolveFormValues = z.infer<typeof resolveSchema>;

export const toResolveBody = (values: ResolveFormValues): ResolveRecoveryBody => ({
  decision: values.decision,
  note: values.note.trim(),
});

/** Parámetro de la URL `?step=` → el escalón a filtrar, o `undefined` si no es 1, 2 o 3. */
export const parseStep = (raw: string): number | undefined => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : undefined;
};
