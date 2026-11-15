import type { ChatParty, TicketPriority, TicketStatus } from '../../services/api/supportChat';
import type { Conversation, MessageDto } from '../../services/api/types';

/**
 * Eventos del socket del panel para el chat con la plataforma y los tickets (`splg-docs/sistema/back/TIEMPO-REAL.md`).
 * Los DTO que viajan adentro son los de la API (generados); acá sólo el sobre de cada evento.
 */
export const CHAT_EVENTS = {
  MESSAGE: 'chat:message',
  CONVERSATION: 'chat:conversation',
  READ: 'chat:read',
  TYPING: 'chat:typing',
  INBOX: 'chat:inbox',
  TICKET_CREATED: 'ticket:created',
  TICKET_UPDATED: 'ticket:updated',
} as const;

export interface ChatMessageEvent {
  conversationId: string;
  distributorId: string;
  seq: number;
  message: MessageDto;
}

export interface ChatConversationEvent {
  conversationId: string;
  distributorId: string;
  change: string;
  /** El `unreadCount` de acá es de la sala (siempre 0): no se usa (B6 del relevamiento). */
  conversation: Conversation;
}

export interface ChatReadEvent {
  conversationId: string;
  party: ChatParty;
  lastReadSeq: number;
}

export interface ChatTypingEvent {
  conversationId: string;
  party: ChatParty;
  until: string;
}

export interface TicketEvent {
  ticketId: string;
  number: string;
  distributorId: string;
  conversationId: string;
  originConversationId: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
}
