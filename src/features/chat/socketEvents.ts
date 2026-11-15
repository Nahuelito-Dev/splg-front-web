import type { ChatParty, TicketPriority, TicketStatus } from '../../services/api/supportChat';
import type { Conversation, InboxConversation, InboxMessage, MessageDto } from '../../services/api/types';

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
  MESSAGE_EDITED: 'chat:message-edited',
  MESSAGE_DELETED: 'chat:message-deleted',
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

/** Un mensaje de la bandeja (nuevo, editado o borrado): cada punta recibe su versión en la sala de la conversación. */
export interface InboxMessageEvent {
  conversationId: string;
  distributorId: string;
  seq: number;
  message: InboxMessage;
}

/** Cambió una conversación de la bandeja (asignada, cerrada, reabierta, reclamo creado). */
export interface InboxConversationEvent {
  conversationId: string;
  distributorId: string;
  change: string;
  conversation: InboxConversation;
}

/** El aviso liviano a las salas de lista de la bandeja (`chat:clientes:<empresa>` / `chat:choferes:<empresa>`). */
export interface InboxListEvent {
  conversationId: string;
  distributorId: string;
  channel: string;
  status: string;
  change: string;
  assignedToUserId: string | null;
  lastMessage: { seq: number; at: string; party: string; kind: string; preview: string | null } | null;
}
