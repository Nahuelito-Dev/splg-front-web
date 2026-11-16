import { z } from 'zod';

/** Mismo tope que `CancelOrderDto.reason`. */
export const CANCEL_REASON_MAX = 500;

/** El back exige un motivo no vacío al cancelar (cliente y administrador) y lo corta en 500. */
export const cancelReasonSchema = z
  .string()
  .trim()
  .min(1, 'Escribí el motivo de la cancelación')
  .max(CANCEL_REASON_MAX, `No puede superar ${CANCEL_REASON_MAX} caracteres`);

export const cancelReasonError = (reason: string): string | undefined => {
  const result = cancelReasonSchema.safeParse(reason);
  return result.success ? undefined : result.error.issues[0]?.message;
};

export const cancelReasonCounter = (reason: string): string => `${reason.trim().length}/${CANCEL_REASON_MAX}`;
