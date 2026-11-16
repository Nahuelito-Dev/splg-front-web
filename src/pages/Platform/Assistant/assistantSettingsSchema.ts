import { z } from 'zod';
import {
  ASSISTANT_REPLIES_MAX,
  ASSISTANT_REPLIES_MIN,
  ASSISTANT_TOKENS_MAX,
  ASSISTANT_TOKENS_MIN,
} from '../../../services/api/supportChat';
import { formatNumber } from '../../../utils/format';

/** Las mismas reglas que `UpdateSupportSettingsDto` del back para el asistente con IA. */
export const supportAssistantSchema = z.object({
  assistantAiEnabled: z.boolean(),
  assistantRepliesPerConversation: z
    .number({ invalid_type_error: 'Poné cuántas respuestas' })
    .int('Un número entero')
    .min(ASSISTANT_REPLIES_MIN, `Al menos ${ASSISTANT_REPLIES_MIN}`)
    .max(ASSISTANT_REPLIES_MAX, `Hasta ${ASSISTANT_REPLIES_MAX}`),
  assistantMonthlyTokenLimit: z
    .number({ invalid_type_error: 'Poné cuántos tokens' })
    .int('Un número entero')
    .min(ASSISTANT_TOKENS_MIN, `Al menos ${formatNumber(ASSISTANT_TOKENS_MIN)}`)
    .max(ASSISTANT_TOKENS_MAX, `Hasta ${formatNumber(ASSISTANT_TOKENS_MAX)}`),
});

export type SupportAssistantValues = z.infer<typeof supportAssistantSchema>;
