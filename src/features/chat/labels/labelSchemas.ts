import { z } from 'zod';
import { CHAT_LABEL_COLORS, CHAT_LABEL_NAME_MAX } from '../../../services/api/chatLabels';
import {
  INACTIVITY_CLOSE_MAX,
  INACTIVITY_CLOSE_MIN,
  INACTIVITY_WARNING_MAX,
  INACTIVITY_WARNING_MIN,
} from '../../../services/api/inbox';

/** Caracteres de control y separadores de línea: el nombre va en una sola línea (como `nombreDeEtiquetaValido`). */
const NON_PRINTABLE = /[\p{Cc}\p{Zl}\p{Zp}]/u;

/** El nombre como lo guarda la API: sin espacios en las puntas y con los de adentro de a uno. */
export const normalizeLabelName = (name: string): string => name.trim().replace(/\s+/g, ' ');

/** Los mismos textos que el back (`bandeja-input.dto.ts`). */
export const LABEL_NAME_INVALID = `El nombre de la etiqueta tiene que tener entre 1 y ${CHAT_LABEL_NAME_MAX} caracteres, en una sola línea`;

export const labelSchema = z.object({
  name: z.string().refine((value) => {
    if (NON_PRINTABLE.test(value)) return false;
    const length = [...normalizeLabelName(value)].length;
    return length >= 1 && length <= CHAT_LABEL_NAME_MAX;
  }, LABEL_NAME_INVALID),
  color: z.enum(CHAT_LABEL_COLORS, { errorMap: () => ({ message: 'Elegí un color de la lista' }) }),
});

export type LabelValues = z.infer<typeof labelSchema>;

/** Los mensajes de la API (`UpdateChatSettingsDto` y la validación combinada del servicio). */
export const CLOSE_RANGE_MESSAGE = 'El cierre por inactividad va de 30 minutos a 7 días (10080 minutos)';
export const WARNING_RANGE_MESSAGE = 'El aviso va de 5 minutos a 24 horas antes del cierre';
export const WARNING_BEFORE_CLOSE_MESSAGE =
  'El aviso tiene que salir antes del cierre: menos minutos que el cierre por inactividad';

/** Un campo de minutos vacío llega como `NaN` (`valueAsNumber`): se acepta acá y lo frena la regla si está prendido. */
const minutes = z.union([z.number(), z.nan()]);

const isIntIn = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;

/**
 * Tiempo esperado y cierre por inactividad, con las reglas del back: el cierre de 30 a 10080 minutos, el aviso de 5 a
 * 1440 y menor que el cierre. Lo apagado no se valida (los minutos vacíos llegan como `NaN`).
 */
export const conversationTimesSchema = z
  .object({
    expectedReplyEnabled: z.boolean(),
    inactivityEnabled: z.boolean(),
    closeMinutes: minutes,
    warningEnabled: z.boolean(),
    warningMinutes: minutes,
  })
  .superRefine((values, ctx) => {
    if (!values.inactivityEnabled) return;
    const closeOk = isIntIn(values.closeMinutes, INACTIVITY_CLOSE_MIN, INACTIVITY_CLOSE_MAX);
    if (!closeOk) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['closeMinutes'], message: CLOSE_RANGE_MESSAGE });
    if (!values.warningEnabled) return;
    if (!isIntIn(values.warningMinutes, INACTIVITY_WARNING_MIN, INACTIVITY_WARNING_MAX)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['warningMinutes'], message: WARNING_RANGE_MESSAGE });
    } else if (closeOk && values.warningMinutes >= values.closeMinutes) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['warningMinutes'], message: WARNING_BEFORE_CLOSE_MESSAGE });
    }
  });

export type ConversationTimesValues = z.infer<typeof conversationTimesSchema>;

/**
 * De qué campo es un 400 de la API al guardar los plazos. Los mensajes vienen en castellano y sin campo: se reconocen
 * por cómo empiezan (los del DTO y del servicio, o la etiqueta del campo que antepone la validación genérica). Lo que
 * habla de los dos (el CHECK de la base) o de otra cosa va al pie.
 */
const FIELD_BY_PREFIX: ReadonlyArray<[prefix: string, field: 'closeMinutes' | 'warningMinutes']> = [
  ['Para avisar antes de cerrar, primero elegí', 'closeMinutes'],
  [`${CLOSE_RANGE_MESSAGE}`, 'closeMinutes'],
  ['Los minutos para cerrar por inactividad', 'closeMinutes'],
  ['Cierre por inactividad (minutos):', 'closeMinutes'],
  [WARNING_RANGE_MESSAGE, 'warningMinutes'],
  [WARNING_BEFORE_CLOSE_MESSAGE, 'warningMinutes'],
  ['Los minutos del aviso', 'warningMinutes'],
  ['Aviso antes del cierre (minutos):', 'warningMinutes'],
];

export const inactivityErrorField = (message: string): 'closeMinutes' | 'warningMinutes' | null =>
  FIELD_BY_PREFIX.find(([prefix]) => message.startsWith(prefix))?.[1] ?? null;
