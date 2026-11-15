import { z } from 'zod';
import {
  AUTO_MESSAGE_MAX,
  FIRST_RESPONSE_MAX,
  FIRST_RESPONSE_MIN,
  HOLIDAY_REASON_MAX,
  HOLIDAY_REASON_MIN,
  TEMPLATE_BODY_MAX,
  TEMPLATE_KEY_MAX,
  TEMPLATE_TITLE_MAX,
  TEMPLATE_TITLE_MIN,
  TEMPLATE_VARIABLES,
} from '../../../services/api/inbox';

/**
 * Las reglas de la configuración de la bandeja, las mismas que el back (`bandeja-input.dto.ts` y `domain/horario.ts`):
 * hora `HH:MM`, apertura antes del cierre, sin solaparse en el mismo día; fecha sin repetir y motivo de 2 a 120; las
 * variables de una lista cerrada.
 */
const HOUR = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const VARIABLE = /\{\{\s*([^}]*?)\s*\}\}/g;

const minutesOf = (hour: string) => {
  const [h, m] = hour.split(':').map(Number);
  return h * 60 + m;
};

/** Las variables `{{…}}` de un texto que el back no conoce (devolvería 400 `TEMPLATE_VARIABLE_UNKNOWN`). */
export const unknownVariables = (text: string): string[] =>
  [...text.matchAll(VARIABLE)]
    .map((match) => match[1])
    .filter((name) => !(TEMPLATE_VARIABLES as readonly string[]).includes(name));

const variablesRule = (text: string | null | undefined, ctx: z.RefinementCtx, path: string) => {
  const unknown = unknownVariables(text ?? '');
  if (unknown.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: `Variable desconocida: {{${unknown[0]}}}. Usá ${TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(', ')}`,
    });
  }
};

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

const slot = z.object({
  weekday: z.number().int().min(0).max(6),
  opensAt: z.string().regex(HOUR, 'Hora como 09:00'),
  closesAt: z.string().regex(HOUR, 'Hora como 18:00'),
});

const holiday = z.object({
  date: z.string().regex(DAY, 'Elegí la fecha'),
  reason: z
    .string()
    .trim()
    .min(HOLIDAY_REASON_MIN, `El motivo tiene que tener al menos ${HOLIDAY_REASON_MIN} letras`)
    .max(HOLIDAY_REASON_MAX, `El motivo puede tener hasta ${HOLIDAY_REASON_MAX} caracteres`),
});

export const businessHoursSchema = z
  .object({
    timezone: z.string().trim().min(3, 'Elegí la zona horaria').max(60),
    days: z.array(slot).max(28, 'Hasta 4 franjas por día'),
    holidays: z.array(holiday).max(100, 'Hasta 100 días sin atención'),
  })
  .superRefine((values, ctx) => {
    values.days.forEach((current, index) => {
      if (!HOUR.test(current.opensAt) || !HOUR.test(current.closesAt)) return;
      if (minutesOf(current.opensAt) >= minutesOf(current.closesAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days', index, 'closesAt'],
          message: 'Cierra antes de abrir',
        });
        return;
      }
      const overlaps = values.days.some(
        (other, j) =>
          j < index &&
          other.weekday === current.weekday &&
          HOUR.test(other.opensAt) &&
          HOUR.test(other.closesAt) &&
          minutesOf(current.opensAt) < minutesOf(other.closesAt) &&
          minutesOf(other.opensAt) < minutesOf(current.closesAt),
      );
      if (overlaps) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days', index, 'opensAt'],
          message: `Se solapa con otra franja del ${WEEKDAYS[current.weekday].toLowerCase()}`,
        });
      }
    });
    const seen = new Set<string>();
    values.holidays.forEach((day, index) => {
      if (seen.has(day.date)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['holidays', index, 'date'], message: 'Esa fecha ya está' });
      }
      seen.add(day.date);
    });
  });

export type BusinessHoursValues = z.infer<typeof businessHoursSchema>;

const optionalText = z.string().max(AUTO_MESSAGE_MAX, `Hasta ${AUTO_MESSAGE_MAX} caracteres`);

export const autoRepliesSchema = z
  .object({
    customerChatEnabled: z.boolean(),
    outOfHoursEnabled: z.boolean(),
    outOfHoursMessage: optionalText,
    ackEnabled: z.boolean(),
    ackMessage: optionalText,
    firstResponseTargetMinutes: z
      .number({ invalid_type_error: 'Poné los minutos' })
      .int('Minutos enteros')
      .min(FIRST_RESPONSE_MIN, `Al menos ${FIRST_RESPONSE_MIN} minutos`)
      .max(FIRST_RESPONSE_MAX, `Hasta ${FIRST_RESPONSE_MAX} minutos (un día)`),
  })
  .superRefine((values, ctx) => {
    variablesRule(values.outOfHoursMessage, ctx, 'outOfHoursMessage');
    variablesRule(values.ackMessage, ctx, 'ackMessage');
  });

export type AutoRepliesValues = z.infer<typeof autoRepliesSchema>;

export const templateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(TEMPLATE_TITLE_MIN, `El título tiene que tener al menos ${TEMPLATE_TITLE_MIN} letras`)
      .max(TEMPLATE_TITLE_MAX, `Hasta ${TEMPLATE_TITLE_MAX} caracteres`),
    key: z
      .string()
      .trim()
      .min(1, 'Poné una clave')
      .max(TEMPLATE_KEY_MAX, `Hasta ${TEMPLATE_KEY_MAX} caracteres`)
      .regex(/^[a-z0-9]+(_[a-z0-9]+)*$/, 'Sólo minúsculas, números y guiones bajos (ej: pedido_en_camino)'),
    body: z
      .string()
      .trim()
      .min(1, 'Escribí la respuesta')
      .max(TEMPLATE_BODY_MAX, `Hasta ${TEMPLATE_BODY_MAX} caracteres`),
    channel: z.enum(['both', 'staff_customer', 'staff_driver']),
    active: z.boolean(),
  })
  .superRefine((values, ctx) => variablesRule(values.body, ctx, 'body'));

export type TemplateValues = z.infer<typeof templateSchema>;

/** Una clave a partir del título: «Pedido en camino» → `pedido_en_camino`. */
export const keyFromTitle = (title: string): string =>
  title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, TEMPLATE_KEY_MAX);
