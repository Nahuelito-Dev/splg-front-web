/** Rutas de las pantallas del chat con la plataforma y los tickets. */
export const SUPPORT_PATH = '/support';
export const companyTicketHref = (ticketId: string) => `${SUPPORT_PATH}/tickets/${encodeURIComponent(ticketId)}`;
export const companyChatHref = (conversationId: string) =>
  `${SUPPORT_PATH}/chats/${encodeURIComponent(conversationId)}`;

export const PLATFORM_CHATS_PATH = '/platform/chats';
export const PLATFORM_TICKETS_PATH = '/platform/tickets';
export const platformChatHref = (conversationId: string) =>
  `${PLATFORM_CHATS_PATH}/${encodeURIComponent(conversationId)}`;
export const platformTicketHref = (ticketId: string) => `${PLATFORM_TICKETS_PATH}/${encodeURIComponent(ticketId)}`;
