import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  listCompanyChatMessages,
  listCompanyTicketMessages,
  listPlatformChatMessages,
  listPlatformTicketMessages,
  readCompanyChat,
  readCompanyTicket,
  readPlatformChat,
  readPlatformTicket,
  sendCompanyChatMessage,
  sendCompanyTicketMessage,
  sendPlatformChatMessage,
  sendPlatformTicketMessage,
} from '../api/supportChat';
import type { ThreadSource } from './chatThread';
import { chatKeys, invalidateChatLists } from './supportChat';

/** Un hilo listo para `ChatThread`: de dónde lee, a dónde escribe y cómo marca leído. */
export interface ThreadBinding {
  source: ThreadSource;
  read?: (seq: number) => Promise<void>;
}

/**
 * El chat de la empresa con la plataforma. Siempre se escribe en «el chat abierto o uno nuevo»: si se cerró (por
 * inactividad o a mano), el próximo mensaje abre otro y la pantalla pasa a él.
 */
export const useCompanyChatThread = (
  conversationId: string | null,
  /** La pantalla pasa a la conversación nueva sin esperar a releer el chat abierto. */
  onSwitch: (conversationId: string) => void,
): ThreadBinding => {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      source: {
        conversationId,
        fetch: conversationId ? (query) => listCompanyChatMessages(conversationId, query) : null,
        send: ({ clientMessageId, body }) => sendCompanyChatMessage({ clientMessageId, body }),
        onSent: (message) => {
          onSwitch(message.conversationId);
          // Los datos del chat abierto (quién atiende, tickets) llegan después; si falla, el hilo ya está a la vista.
          void queryClient.invalidateQueries({ queryKey: chatKeys.companyChat() });
        },
      },
      read: conversationId ? (seq) => readCompanyChat(conversationId, seq) : undefined,
    }),
    [conversationId, onSwitch, queryClient],
  );
};

/** Un chat cerrado de la empresa, sólo para leer (el historial). */
export const useCompanyArchivedChatThread = (conversationId: string): ThreadBinding =>
  useMemo(
    () => ({
      source: {
        conversationId,
        fetch: (query) => listCompanyChatMessages(conversationId, query),
        send: () => Promise.reject(new Error('El chat está cerrado')),
      },
    }),
    [conversationId],
  );

/** El hilo de un ticket, del lado de la empresa (por el id del ticket; la sala es su conversación). */
export const useCompanyTicketThread = (ticketId: string, conversationId: string): ThreadBinding => {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      source: {
        conversationId,
        fetch: (query) => listCompanyTicketMessages(ticketId, query),
        send: async ({ clientMessageId, body }) => {
          const message = await sendCompanyTicketMessage(ticketId, { clientMessageId, body });
          // Responder cambia el estado del ticket (esperaba a la empresa o estaba resuelto → en curso).
          void invalidateChatLists(queryClient);
          return message;
        },
      },
      read: (seq) => readCompanyTicket(ticketId, seq),
    }),
    [conversationId, queryClient, ticketId],
  );
};

export const usePlatformChatThread = (conversationId: string): ThreadBinding => {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      source: {
        conversationId,
        fetch: (query) => listPlatformChatMessages(conversationId, query),
        send: async ({ clientMessageId, body }) => {
          const message = await sendPlatformChatMessage(conversationId, { clientMessageId, body });
          // La primera respuesta deja el chat atendido por quien escribe.
          void invalidateChatLists(queryClient);
          return message;
        },
      },
      read: (seq) => readPlatformChat(conversationId, seq),
    }),
    [conversationId, queryClient],
  );
};

export const usePlatformTicketThread = (ticketId: string, conversationId: string): ThreadBinding => {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      source: {
        conversationId,
        fetch: (query) => listPlatformTicketMessages(ticketId, query),
        send: async ({ clientMessageId, body, visibility }) => {
          const message = await sendPlatformTicketMessage(ticketId, {
            clientMessageId,
            body,
            visibility: visibility ?? 'all',
          });
          void invalidateChatLists(queryClient);
          return message;
        },
      },
      read: (seq) => readPlatformTicket(ticketId, seq),
    }),
    [conversationId, queryClient, ticketId],
  );
};
