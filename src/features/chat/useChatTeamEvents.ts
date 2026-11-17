import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSocketContext } from '../../context/useSocketContext';
import { applyTeamEvent } from '../../services/queries/chatAssignment';
import { inboxKeys } from '../../services/queries/inbox';
import { CHAT_EVENTS, type ChatTeamEvent } from './socketEvents';

/**
 * Escucha `chat:team` mientras está abierta la pantalla que lo muestra (la cabecera de la bandeja o el equipo) y lo
 * lleva a la caché. Al reconectar se relee: lo que cambió sin conexión no vuelve a llegar.
 */
export const useChatTeamEvents = (myUserId: string | undefined, enabled = true) => {
  const { subscribe, isOnline } = useSocketContext();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    return subscribe<ChatTeamEvent>(CHAT_EVENTS.TEAM, (event) => {
      if (event?.userId) applyTeamEvent(queryClient, event, myUserId);
    });
  }, [enabled, subscribe, queryClient, myUserId]);

  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (enabled && isOnline && !wasOnline.current) {
      void queryClient.invalidateQueries({ queryKey: inboxKeys.chatStatus() });
      void queryClient.invalidateQueries({ queryKey: inboxKeys.agents() });
    }
    wasOnline.current = isOnline;
  }, [enabled, isOnline, queryClient]);
};
