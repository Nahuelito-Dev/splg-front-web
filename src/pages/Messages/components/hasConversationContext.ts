import type { InboxConversation } from '../../../services/api/types';

/** Si la conversación tiene algo para mostrar al costado (el pedido o el reclamo vinculado). */
export const hasConversationContext = (conversation: InboxConversation): boolean =>
  Boolean(conversation.order) || Boolean(conversation.linkedClaimId);
