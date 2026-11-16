import { z } from 'zod';
import { BROADCAST_MAX, CLAIM_DESCRIPTION_MAX, CLAIM_REASON_MAX } from '../../../services/api/inbox';
import { MESSAGE_MAX } from '../../../services/api/supportChat';

/** Las mismas reglas que `BroadcastDriversDto`: 1 a 50 choferes y un texto de 1 a 2000. */
export const broadcastSchema = z.object({
  driverIds: z
    .array(z.string())
    .min(1, 'Elegí al menos un chofer')
    .max(BROADCAST_MAX, `Podés avisar a ${BROADCAST_MAX} choferes por vez`),
  body: z
    .string()
    .trim()
    .min(1, 'Escribí el aviso')
    .max(MESSAGE_MAX, `El aviso puede tener hasta ${MESSAGE_MAX} caracteres`),
});

export type BroadcastValues = z.infer<typeof broadcastSchema>;

/** Las mismas reglas que `SendStaffMessageDto.body`. */
export const firstMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Escribí el mensaje')
    .max(MESSAGE_MAX, `El mensaje puede tener hasta ${MESSAGE_MAX} caracteres`),
});

export type FirstMessageValues = z.infer<typeof firstMessageSchema>;

/** Las mismas reglas que `CreateClaimFromConversationDto`: motivo hasta 120 y descripción hasta 1000, sin vacíos. */
export const claimFromChatSchema = (needsOrder: boolean) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(1, 'Contá el motivo del reclamo')
      .max(CLAIM_REASON_MAX, `El motivo puede tener hasta ${CLAIM_REASON_MAX} caracteres`),
    description: z
      .string()
      .trim()
      .min(1, 'Describí el reclamo')
      .max(CLAIM_DESCRIPTION_MAX, `La descripción puede tener hasta ${CLAIM_DESCRIPTION_MAX} caracteres`),
    orderId: needsOrder ? z.string().min(1, 'Elegí el pedido reclamado') : z.string().optional(),
  });

export type ClaimFromChatValues = z.infer<ReturnType<typeof claimFromChatSchema>>;
