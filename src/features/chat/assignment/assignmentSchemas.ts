import { z } from 'zod';
import { AUTO_ASSIGN_MAX_OPEN_MAX, AUTO_ASSIGN_MAX_OPEN_MIN } from '../../../services/api/chatAssignment';

/** El mensaje de la API (`UpdateChatSettingsDto.autoAssignMaxOpen` y `UpdateChatAgentDto.maxOpenOverride`). */
export const MAX_OPEN_RANGE_MESSAGE = 'El tope de conversaciones abiertas por persona va de 1 a 50';

/** Un campo de número vacío llega como `NaN` (`valueAsNumber`): se acepta acá y lo frena la regla cuando aplica. */
const count = z.union([z.number(), z.nan()]);

const isMaxOpen = (value: number) =>
  Number.isInteger(value) && value >= AUTO_ASSIGN_MAX_OPEN_MIN && value <= AUTO_ASSIGN_MAX_OPEN_MAX;

/** La tarjeta «Asignación automática»: el interruptor y el tope general (entero de 1 a 50, como el back). */
export const autoAssignSchema = z
  .object({ autoAssignEnabled: z.boolean(), autoAssignMaxOpen: count })
  .superRefine((values, ctx) => {
    if (!isMaxOpen(values.autoAssignMaxOpen)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['autoAssignMaxOpen'], message: MAX_OPEN_RANGE_MESSAGE });
    }
  });

export type AutoAssignValues = z.infer<typeof autoAssignSchema>;

/** El tope de una persona: el de la empresa (`null` en la API) o uno propio de 1 a 50. */
export const agentLimitSchema = z
  .object({ mode: z.enum(['company', 'own']), maxOpen: count })
  .superRefine((values, ctx) => {
    if (values.mode === 'own' && !isMaxOpen(values.maxOpen)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxOpen'], message: MAX_OPEN_RANGE_MESSAGE });
    }
  });

export type AgentLimitValues = z.infer<typeof agentLimitSchema>;

/**
 * Si un mensaje de un 400 habla del tope: el del rango y los de la validación genérica, que anteponen la etiqueta del
 * campo («Tope de conversaciones abiertas por persona: …», «Tope propio de conversaciones abiertas: …»).
 */
export const isMaxOpenError = (message: string): boolean => /^(el )?tope/i.test(message);
