/** Rutas de las pantallas del chat con la plataforma y los tickets. */
export const SUPPORT_PATH = '/support';
export const companyTicketHref = (ticketId: string) => `${SUPPORT_PATH}/tickets/${encodeURIComponent(ticketId)}`;
export const companyChatHref = (conversationId: string) =>
  `${SUPPORT_PATH}/chats/${encodeURIComponent(conversationId)}`;

export const PLATFORM_CHATS_PATH = '/platform/chats';
export const PLATFORM_TICKETS_PATH = '/platform/tickets';
/** El tablero del soporte: chat con las empresas, tickets y asistente de la plataforma. */
export const PLATFORM_SUPPORT_METRICS_PATH = '/platform/support-metrics';
export const platformChatHref = (conversationId: string) =>
  `${PLATFORM_CHATS_PATH}/${encodeURIComponent(conversationId)}`;
export const platformTicketHref = (ticketId: string) => `${PLATFORM_TICKETS_PATH}/${encodeURIComponent(ticketId)}`;

/** La bandeja de la empresa con clientes y choferes (CH4). */
export const MESSAGES_PATH = '/messages';
export const MESSAGES_SETTINGS_PATH = '/messages/settings';
/** Las métricas de la bandeja (`mensajes.supervisar`). */
export const MESSAGES_METRICS_PATH = '/messages/metrics';
/** El equipo de la bandeja: quién está en línea, su carga y su tope (`mensajes.supervisar` o `mensajes.configurar`). */
export const MESSAGES_TEAM_PATH = '/messages/team';
export const messageHref = (conversationId: string) => `${MESSAGES_PATH}/${encodeURIComponent(conversationId)}`;
export const claimHref = (claimId: string) => `/claims?claim=${encodeURIComponent(claimId)}`;
/** Las preguntas frecuentes con las que responde el asistente de la empresa («Asistente del chat»). */
export const ASSISTANT_FAQS_PATH = '/settings/assistant';
