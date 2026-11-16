import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSocketContext } from '../../context/useSocketContext';
import type { CompanyPlatformChat, Conversation, Ticket, TicketSummary } from '../../services/api/types';
import { applyCounterpartRead, applyIncomingMessage, catchUpThreads } from '../../services/queries/chatThread';
import { chatKeys, invalidateChatLists, type ChatSide } from '../../services/queries/supportChat';
import { alertIncoming, firstAlertOf } from './alerts';
import {
  CHAT_EVENTS,
  type ChatConversationEvent,
  type ChatMessageEvent,
  type ChatReadEvent,
  type ChatTypingEvent,
  type TicketEvent,
} from './socketEvents';
import { typingStore } from './typing';

/** Los canales de la bandeja de la empresa con clientes y choferes: los atiende `useInboxBridge`. */
const isInboxChannel = (channel: string | undefined) => channel === 'staff_customer' || channel === 'staff_driver';

/** Varios avisos seguidos (un mensaje trae `chat:message` y `chat:inbox`) releen las listas una sola vez. */
const LISTS_DEBOUNCE_MS = 300;

/** La tarjeta de un ticket dentro de un chat (`ticketsFromHere`) con el estado que avisó el socket. */
const patchCards = (conversation: Conversation, event: TicketEvent): Conversation => ({
  ...conversation,
  ticketsFromHere: conversation.ticketsFromHere?.map((ticket: TicketSummary) =>
    ticket.id === event.ticketId
      ? { ...ticket, status: event.status, priority: event.priority, subject: event.subject }
      : ticket,
  ),
});

const applyTicket = (queryClient: QueryClient, side: ChatSide, event: TicketEvent) => {
  queryClient.setQueryData<Ticket>(chatKeys.ticket(side, event.ticketId), (ticket: Ticket | undefined) =>
    ticket ? { ...ticket, status: event.status, priority: event.priority, subject: event.subject } : ticket,
  );
  void queryClient.invalidateQueries({ queryKey: chatKeys.ticket(side, event.ticketId) });
  if (side === 'company') {
    queryClient.setQueryData<CompanyPlatformChat>(chatKeys.companyChat(), (data: CompanyPlatformChat | undefined) =>
      data?.conversation ? { conversation: patchCards(data.conversation, event) } : data,
    );
  } else if (event.originConversationId) {
    queryClient.setQueryData<Conversation>(
      chatKeys.platformChat(event.originConversationId),
      (conversation: Conversation | undefined) => (conversation ? patchCards(conversation, event) : conversation),
    );
  }
};

/**
 * El puente único entre el socket y la caché de React Query para el chat con la plataforma y los tickets (P12), como
 * `useSocket` con los pedidos. Lo monta una sola vez el layout. Un mensaje se agrega a su hilo si está abierto; las
 * listas y los contadores se releen por HTTP (el «sin leer» es de cada persona y el socket no lo trae). Al reconectar,
 * cada hilo abierto se pone al día y las listas se releen.
 */
export const useSupportChatBridge = (side: ChatSide | null, alertTitle: string) => {
  const { subscribe, isOnline } = useSocketContext();
  const queryClient = useQueryClient();
  const titleRef = useRef(alertTitle);
  titleRef.current = alertTitle;

  useEffect(() => {
    if (!side) return;
    let timer: number | undefined;
    const firstAlert = firstAlertOf();
    const refreshLists = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void invalidateChatLists(queryClient), LISTS_DEBOUNCE_MS);
    };
    const offs = [
      subscribe<ChatMessageEvent>(CHAT_EVENTS.MESSAGE, ({ message }) => {
        // Los de la bandeja (clientes y choferes) no traen `visibility`: son de `useInboxBridge`.
        if (!message || !('visibility' in message)) return;
        // Una versión nueva de uno que ya estaba (el adjunto ya escaneado) no se avisa otra vez.
        const known = applyIncomingMessage(queryClient, message) === 'known';
        if (!message.isMine) typingStore.clear(message.conversationId);
        if (!known && firstAlert(message.conversationId, message.seq)) alertIncoming(message, titleRef.current);
        refreshLists();
      }),
      subscribe<ChatConversationEvent>(CHAT_EVENTS.CONVERSATION, ({ conversationId, conversation }) => {
        if (isInboxChannel(conversation?.channel)) return;
        // La ficha llega con el `unreadCount` de la sala (0): se conserva el de quien mira.
        queryClient.setQueryData<Conversation>(
          chatKeys.platformChat(conversationId),
          (current: Conversation | undefined) =>
            current && side === 'platform' ? { ...conversation, unreadCount: current.unreadCount } : current,
        );
        refreshLists();
      }),
      subscribe<ChatReadEvent>(CHAT_EVENTS.READ, ({ conversationId, party, lastReadSeq }) => {
        if (party === 'customer' || party === 'driver') return;
        if (party !== side) applyCounterpartRead(queryClient, conversationId, lastReadSeq);
        refreshLists();
      }),
      subscribe<ChatTypingEvent>(CHAT_EVENTS.TYPING, ({ conversationId, party, until }) => {
        if (party === 'customer' || party === 'driver') return;
        if (party !== side) typingStore.set(conversationId, party, until);
      }),
      subscribe<{ channel?: string }>(CHAT_EVENTS.INBOX, (event) => {
        if (!isInboxChannel(event?.channel)) refreshLists();
      }),
      subscribe<TicketEvent>(CHAT_EVENTS.TICKET_CREATED, (event) => {
        applyTicket(queryClient, side, event);
        refreshLists();
      }),
      subscribe<TicketEvent>(CHAT_EVENTS.TICKET_UPDATED, (event) => {
        applyTicket(queryClient, side, event);
        refreshLists();
      }),
    ];
    return () => {
      window.clearTimeout(timer);
      offs.forEach((off) => off());
      typingStore.reset();
    };
  }, [side, subscribe, queryClient]);

  // Reconexión: lo que pasó sin conexión se recupera por HTTP (P3). La primera conexión no cuenta.
  const wasOnline = useRef<boolean | null>(null);
  useEffect(() => {
    if (!side) return;
    if (isOnline && wasOnline.current === false) {
      void catchUpThreads(queryClient);
      void invalidateChatLists(queryClient);
    }
    if (isOnline || wasOnline.current !== null) wasOnline.current = isOnline;
  }, [isOnline, side, queryClient]);
};
