import { z } from 'zod';
import { SUPPORT_MINUTES, SUPPORT_NOTE_MAX } from '../../../services/api/supportSessions';
import type { SupportSession } from '../../../services/api/types';

/** Lo que el admin aprueba: igual o menos que lo pedido (la API rechaza ampliar con `SUPPORT_APPROVAL_EXCEEDS_REQUEST`). */
export const approvalSchema = (requested: SupportSession) =>
  z.object({
    minutes: z
      .number({ invalid_type_error: 'Elegí la duración' })
      .refine((m) => (SUPPORT_MINUTES as readonly number[]).includes(m), 'Elegí 15, 30, 60 o 120 minutos')
      .refine(
        (m) => m <= requested.requestedMinutes,
        `No puede ser más de lo pedido (${requested.requestedMinutes} min)`,
      ),
    personal_data: z.boolean(),
    files: z.boolean(),
    exports: z.boolean(),
    note: z.string().trim().max(SUPPORT_NOTE_MAX, `La nota puede tener hasta ${SUPPORT_NOTE_MAX} caracteres`),
  });
export type ApprovalValues = z.infer<ReturnType<typeof approvalSchema>>;

export const rejectSchema = z.object({
  note: z.string().trim().max(SUPPORT_NOTE_MAX, `La nota puede tener hasta ${SUPPORT_NOTE_MAX} caracteres`),
});
export type RejectValues = z.infer<typeof rejectSchema>;
