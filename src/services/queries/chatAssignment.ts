import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ChatTeamEvent } from '../../features/chat/socketEvents';
import {
  getMyChatStatus,
  listChatAgents,
  updateChatAgent,
  updateMyChatStatus,
  type ChatAgentStatus,
} from '../api/chatAssignment';
import type { ChatAgentList, ChatStatus } from '../api/types';
import { inboxKeys } from './inbox';

/** Respaldo del socket: quien supervisa sin atender ningún canal no recibe `chat:team`. */
export const CHAT_TEAM_POLL_MS = 30_000;

/** El estado propio de quien atiende algún canal (la cabecera de la bandeja). */
export const useMyChatStatus = (enabled: boolean) =>
  useQuery({ queryKey: inboxKeys.chatStatus(), queryFn: getMyChatStatus, enabled, retry: false });

export const useUpdateMyChatStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: ChatAgentStatus) => updateMyChatStatus({ status }),
    // Se relee en lugar de pisar con la respuesta: un `chat:team` más nuevo (lo que repartió el PUT) no se pierde.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: inboxKeys.chatStatus() }),
        queryClient.invalidateQueries({ queryKey: inboxKeys.agents() }),
      ]),
  });
};

/** El equipo de la bandeja (`mensajes.supervisar` o `mensajes.configurar`). */
export const useChatAgents = (enabled: boolean) =>
  useQuery({
    queryKey: inboxKeys.agents(),
    queryFn: listChatAgents,
    enabled,
    retry: false,
    refetchInterval: CHAT_TEAM_POLL_MS,
  });

export const useUpdateChatAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, maxOpenOverride }: { userId: string; maxOpenOverride: number | null }) =>
      updateChatAgent(userId, { maxOpenOverride }),
    onSuccess: (agent) => {
      queryClient.setQueryData<ChatAgentList>(inboxKeys.agents(), (current: ChatAgentList | undefined) =>
        current
          ? { ...current, items: current.items.map((item) => (item.userId === agent.userId ? agent : item)) }
          : current,
      );
      // Puede ser el tope de quien mira.
      void queryClient.invalidateQueries({ queryKey: inboxKeys.chatStatus() });
    },
  });
};

/**
 * Lleva un `chat:team` a la caché: la fila del equipo y, si es de quien mira, su estado propio. Alguien que la tabla no
 * conoce (se sumó al equipo) relee la lista.
 */
export const applyTeamEvent = (queryClient: QueryClient, event: ChatTeamEvent, myUserId: string | undefined) => {
  const { userId, status, connected, available, openAssigned } = event;
  const change = { status, connected, available, openAssigned };
  const list = queryClient.getQueryData<ChatAgentList>(inboxKeys.agents());
  if (list) {
    if (list.items.some((item) => item.userId === userId)) {
      queryClient.setQueryData<ChatAgentList>(inboxKeys.agents(), {
        ...list,
        items: list.items.map((item) => (item.userId === userId ? { ...item, ...change } : item)),
      });
    } else {
      void queryClient.invalidateQueries({ queryKey: inboxKeys.agents() });
    }
  }
  if (myUserId && userId === myUserId) {
    queryClient.setQueryData<ChatStatus>(inboxKeys.chatStatus(), (current: ChatStatus | undefined) =>
      current ? { ...current, ...change } : current,
    );
  }
};
