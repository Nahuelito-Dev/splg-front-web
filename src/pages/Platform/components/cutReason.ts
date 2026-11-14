import { z } from 'zod';
import { SUPPORT_REASON_MAX, SUPPORT_REASON_MIN } from '../../../services/api/supportSessions';

/** La misma regla que `EndSupportSessionDto` de la API: 20 a 1000 caracteres, sin contar los espacios de los extremos. */
export const cutReasonSchema = z
  .string()
  .trim()
  .min(SUPPORT_REASON_MIN, `Contá por qué la cortás en al menos ${SUPPORT_REASON_MIN} caracteres: queda registrado`)
  .max(SUPPORT_REASON_MAX, `El motivo puede tener hasta ${SUPPORT_REASON_MAX} caracteres`);

/** El error del motivo para el modal, o `undefined` si está bien. */
export const cutReasonError = (reason: string): string | undefined => {
  const result = cutReasonSchema.safeParse(reason);
  return result.success ? undefined : result.error.issues[0]?.message;
};

/** Cuántos caracteres van (sin los espacios de los extremos), para guiar mientras se escribe. */
export const cutReasonCounter = (reason: string): string => `${reason.trim().length} de ${SUPPORT_REASON_MAX}`;
