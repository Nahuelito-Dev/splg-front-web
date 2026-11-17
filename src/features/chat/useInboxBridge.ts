import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSocketContext } from '../../context/useSocketContext';
import type { InboxConversation, InboxList } from '../../services/api/types';
import {
  applyCounterpartRead,
  applyIncomingMessage,
  applyMessageUpdate,
  catchUpThreads,
} from '../../services/queries/chatThread';
import { inboxKeys, invalidateInbox } from '../../services/queries/inbox';
import { alertInboxMessage, alertIncoming, dismissAlert, firstAlertOf } from './alerts';
import { counterpartName } from './inbox/inboxLabels';
import { isRoomOpen } from './useConversationRoom';
import {
  CHAT_EVENTS,
  type ChatReadEvent,
  type ChatTypingEvent,
  type InboxConversationEvent,
  type InboxListEvent,
  type InboxMessageEvent,
} from './socketEvents';
import { toChatMessage } from './thread';
import { typingStore } from './typing';

/** Varios avisos seguidos (un mensaje trae `chat:message` y `chat:inbox`) releen la bandeja una sola vez. */
const LISTS_DEBOUNCE_MS = 300;

/** El `change` de `chat:conversation` / `chat:inbox` cuando cambian las etiquetas de una conversación (7c). */
const LABELS_CHANGE = 'labels';

const fromPerson = (party: string) => party === 'customer' || party === 'driver';
/** Un canal de la bandeja (el resto es del chat con la plataforma, que lleva su propio puente). */
const isInboxChannel = (channel: string | undefined) => channel === 'staff_customer' || channel === 'staff_driver';

/** El nombre de quien escribió, si la bandeja ya lo tiene en caché (sin pedir nada); si no, «un cliente/chofer». */
const nameOf = (queryClient: QueryClient, conversationId: string, channel: string): string => {
  const detail = queryClient.getQueryData<InboxConversation>(inboxKeys.detail(conversationId));
  const fromList = queryClient
    .getQueriesData<InboxList>({ queryKey: [...inboxKeys.all, 'list'] })
    .flatMap(([, data]) => data?.items ?? [])
    .find((c) => c.id === conversationId);
  const known = detail ?? fromList;
  if (known) return counterpartName(known);
  return channel === 'staff_driver' ? 'un chofer' : 'un cliente';
};

/**
 * El puente entre el socket y la caché de la bandeja de la empresa (clientes y choferes), como `useSupportChatBridge`
 * con el chat de soporte: un mensaje entra a su hilo si está abierto (mismo núcleo: `seq`, sin duplicar), uno editado o
 * borrado se reemplaza en su lugar, y las listas y la insignia se releen por HTTP (el «sin leer» es de cada persona).
 * Al reconectar, cada hilo abierto se pone al día y la bandeja se relee. Lo monta una vez `SupportChatHost`.
 */
export const useInboxBridge = (enabled: boolean) => {
  const { subscribe, isOnline } = useSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const firstAlert = firstAlertOf();
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void invalidateInbox(queryClient), LISTS_DEBOUNCE_MS);
    };
    const offs = [
      subscribe<InboxMessageEvent>(CHAT_EVENTS.MESSAGE, ({ message }) => {
        // Los del chat con la plataforma traen `visibility`: son del otro puente.
        if (!message || 'visibility' in message) return;
        // Una versión nueva de uno que ya estaba (el adjunto ya escaneado) no se avisa otra vez.
        const known = applyIncomingMessage(queryClient, message) === 'known';
        if (!fromPerson(message.party)) return;
        typingStore.clear(message.conversationId);
        // Con la conversación abierta en pantalla avisa éste (con el texto); si no, `chat:inbox` (sin el texto).
        if (!known && isRoomOpen(message.conversationId) && firstAlert(message.conversationId, message.seq)) {
          alertIncoming(toChatMessage(message), `Mensaje de ${message.sender?.displayName ?? 'un cliente'}`);
        }
        refresh();
      }),
      subscribe<InboxMessageEvent>(CHAT_EVENTS.MESSAGE_EDITED, ({ message }) => {
        if (!message || 'visibility' in message) return;
        applyMessageUpdate(queryClient, message);
        refresh();
      }),
      subscribe<InboxMessageEvent>(CHAT_EVENTS.MESSAGE_DELETED, ({ conversationId, seq, message }) => {
        dismissAlert(conversationId, seq);
        if (!message || 'visibility' in message) return;
        applyMessageUpdate(queryClient, message);
        refresh();
      }),
      subscribe<InboxConversationEvent>(CHAT_EVENTS.CONVERSATION, ({ conversationId, conversation, change }) => {
        if (!isInboxChannel(conversation?.channel)) return;
        // La ficha llega con el «sin leer» de la sala (0): se conserva el de quien mira. El tiempo esperado sólo lo trae
        // el detalle por HTTP: también se conserva.
        queryClient.setQueryData<InboxConversation>(
          inboxKeys.detail(conversationId),
          (current: InboxConversation | undefined) =>
            current && conversation?.channel
              ? {
                  ...conversation,
                  unreadCount: current.unreadCount,
                  lastReadSeq: current.lastReadSeq,
                  expectedReply: conversation.expectedReply ?? current.expectedReply,
                }
              : current,
        );
        // Etiquetas puestas, sacadas, renombradas o dadas de baja (acá o en otra pestaña): también el catálogo.
        if (change === LABELS_CHANGE) void queryClient.invalidateQueries({ queryKey: inboxKeys.labels() });
        refresh();
      }),
      subscribe<ChatReadEvent>(CHAT_EVENTS.READ, ({ conversationId, party, lastReadSeq }) => {
        if (fromPerson(party)) applyCounterpartRead(queryClient, conversationId, lastReadSeq);
        // Lo leyó quien mira en otra pestaña: baja la insignia.
        else if (party === 'company') refresh();
      }),
      subscribe<ChatTypingEvent>(CHAT_EVENTS.TYPING, ({ conversationId, party, until }) => {
        if (fromPerson(party)) typingStore.set(conversationId, party, until);
      }),
      subscribe<InboxListEvent>(CHAT_EVENTS.INBOX, (event) => {
        if (!isInboxChannel(event.channel)) return;
        if (event.change === LABELS_CHANGE) void queryClient.invalidateQueries({ queryKey: inboxKeys.labels() });
        refresh();
        const last = event.lastMessage;
        // Un mensaje nuevo de un cliente o un chofer en una conversación que no está en pantalla: aviso genérico.
        if (event.change === 'message' && last && fromPerson(last.party) && !isRoomOpen(event.conversationId)) {
          alertInboxMessage(
            event.conversationId,
            last.seq,
            `Nuevo mensaje de ${nameOf(queryClient, event.conversationId, event.channel)}`,
          );
        }
      }),
    ];
    return () => {
      window.clearTimeout(timer);
      offs.forEach((off) => off());
    };
  }, [enabled, subscribe, queryClient]);

  // Reconexión: lo que pasó sin conexión se recupera por HTTP. La primera conexión no cuenta.
  const wasOnline = useRef<boolean | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (isOnline && wasOnline.current === false) {
      void catchUpThreads(queryClient);
      void invalidateInbox(queryClient);
    }
    if (isOnline || wasOnline.current !== null) wasOnline.current = isOnline;
  }, [enabled, isOnline, queryClient]);
};
