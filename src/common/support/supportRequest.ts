import { z } from 'zod';
import {
  EMERGENCY_MAX_MINUTES,
  SUPPORT_MINUTES,
  SUPPORT_REASON_MAX,
  SUPPORT_REASON_MIN,
  SUPPORT_TICKET_MAX,
  type SupportScope,
} from '../../services/api/supportSessions';
import type { CreateSupportSessionBody } from '../../services/api/types';

export const DEFAULT_MINUTES = 60;

/** Lo que se puede sumar a lo básico, con la explicación que ve quien pide (y después la empresa). */
export const SCOPE_OPTIONS: { value: SupportScope; label: string; hint: string }[] = [
  {
    value: 'personal_data',
    label: 'Datos personales',
    hint: 'Teléfonos, correos y documentos de clientes, choferes y empleados sin ocultar.',
  },
  { value: 'files', label: 'Archivos', hint: 'Fotos y documentos subidos (vehículos, legajos, comprobantes).' },
  { value: 'exports', label: 'Exportes', hint: 'Descargar planillas y PDF de la empresa.' },
];

/** Las mismas reglas que valida la API (`CreateSupportSessionDto`). */
export const supportRequestSchema = z
  .object({
    distributorId: z.string().uuid('Elegí la empresa'),
    reason: z
      .string()
      .trim()
      .min(SUPPORT_REASON_MIN, `Contá el motivo en al menos ${SUPPORT_REASON_MIN} caracteres: lo lee la empresa`)
      .max(SUPPORT_REASON_MAX, `El motivo puede tener hasta ${SUPPORT_REASON_MAX} caracteres`),
    ticketRef: z
      .string()
      .trim()
      .max(SUPPORT_TICKET_MAX, `La referencia puede tener hasta ${SUPPORT_TICKET_MAX} caracteres`),
    minutes: z
      .number({ invalid_type_error: 'Elegí la duración' })
      .refine((m) => (SUPPORT_MINUTES as readonly number[]).includes(m), 'Elegí 15, 30, 60 o 120 minutos'),
    personal_data: z.boolean(),
    files: z.boolean(),
    exports: z.boolean(),
    emergency: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.emergency && data.minutes > EMERGENCY_MAX_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Un acceso de emergencia dura como máximo ${EMERGENCY_MAX_MINUTES} minutos`,
        path: ['minutes'],
      });
    }
  });

export type RequestSupportValues = z.infer<typeof supportRequestSchema>;

/** Del formulario al cuerpo de `POST /v2/support-sessions`. */
export const toSupportRequest = (values: RequestSupportValues): CreateSupportSessionBody => ({
  distributorId: values.distributorId,
  reason: values.reason.trim(),
  ticketRef: values.ticketRef.trim() || undefined,
  minutes: values.minutes as CreateSupportSessionBody['minutes'],
  scope: SCOPE_OPTIONS.filter((option) => values[option.value]).map((option) => option.value),
  emergency: values.emergency,
});

export const emptySupportRequest = (distributorId = ''): RequestSupportValues => ({
  distributorId,
  reason: '',
  ticketRef: '',
  minutes: DEFAULT_MINUTES,
  personal_data: false,
  files: false,
  exports: false,
  emergency: false,
});
