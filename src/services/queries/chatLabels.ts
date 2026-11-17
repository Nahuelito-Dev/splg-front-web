import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  createChatLabel,
  deleteChatLabel,
  listChatLabels,
  setConversationLabels,
  updateChatLabel,
} from '../api/chatLabels';
import { listConversations } from '../api/inbox';
import type { CreateChatLabelBody, UpdateChatLabelBody } from '../api/types';
import { queryKeys } from './queryKeys';
import { inboxKeys, invalidateInbox } from './inbox';

/** Cuánto se usa el catálogo sin volver a pedirlo (una etiqueta nueva de otra pestaña aparece enseguida). */
export const CHAT_LABELS_STALE_MS = 30_000;

/**
 * El catálogo de etiquetas de la empresa (configuración, editor de la conversación, filtro de la bandeja). `fresh`: lo
 * vuelve a pedir al montar aunque esté al día (al abrir el editor).
 */
export const useChatLabels = (enabled = true, fresh = false) =>
  useQuery({
    queryKey: inboxKeys.labels(),
    queryFn: listChatLabels,
    enabled,
    staleTime: CHAT_LABELS_STALE_MS,
    ...(fresh ? { refetchOnMount: 'always' as const } : {}),
  });

/**
 * Un cambio en el catálogo relee el catálogo, la bandeja (las fichas y listas muestran el nombre y el color nuevos; el
 * socket también avisa) y las métricas (el corte por etiqueta).
 */
const useLabelMutation = <V, R>(fn: (vars: V) => Promise<R>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: inboxKeys.labels() }),
        invalidateInbox(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.chatMetrics.all }),
      ]),
  });
};

export const useCreateChatLabel = () => useLabelMutation((body: CreateChatLabelBody) => createChatLabel(body));

export const useUpdateChatLabel = () =>
  useLabelMutation(({ id, body }: { id: string; body: UpdateChatLabelBody }) => updateChatLabel(id, body));

export const useDeleteChatLabel = () => useLabelMutation((id: string) => deleteChatLabel(id));

/**
 * En cuántas conversaciones está una etiqueta (abiertas y cerradas de los canales que atiende quien pregunta), para la
 * confirmación de la baja. `null` si no se pudo saber (p. ej. quien configura no atiende ningún canal).
 */
export const useLabelConversationCount = () => {
  const queryClient = useQueryClient();
  return useCallback(
    async (labelId: string): Promise<number | null> => {
      const params = { labelId, limit: 1, offset: 0 };
      try {
        const page = await queryClient.fetchQuery({
          queryKey: inboxKeys.list(params),
          queryFn: () => listConversations(params),
          staleTime: 0,
        });
        return page.total;
      } catch {
        return null;
      }
    },
    [queryClient],
  );
};

/** Poner o sacar etiquetas de una conversación (reemplaza): deja la ficha que devuelve la API y relee la bandeja. */
export const useSetConversationLabels = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, labelIds }: { id: string; labelIds: string[] }) => setConversationLabels(id, labelIds),
    onSuccess: (conversation) => {
      // La respuesta no trae el tiempo esperado (sólo lo da el detalle): se conserva el que había.
      queryClient.setQueryData(inboxKeys.detail(conversation.id), (current: typeof conversation | undefined) => ({
        ...conversation,
        expectedReply: conversation.expectedReply ?? current?.expectedReply,
      }));
    },
    onSettled: () => invalidateInbox(queryClient),
  });
};
