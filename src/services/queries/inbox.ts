import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toChatMessage } from '../../features/chat/thread';
import { getConversationAttachmentLink, uploadConversationAttachment } from '../api/chatAttachments';
import {
  assignConversation,
  broadcastDrivers,
  closeConversation,
  createClaimFromConversation,
  createCompanyTemplate,
  deleteCompanyTemplate,
  editConversationMessage,
  getBusinessHours,
  getChatSettings,
  getConversation,
  getConversationSuggestions,
  getCsatSummary,
  getInboxSummary,
  listConversationAssignees,
  listCompanyTemplates,
  listConversationMessages,
  listConversations,
  markMentionsRead,
  openConversation,
  readConversation,
  reopenConversation,
  sendConversationMessage,
  sendConversationNote,
  updateBusinessHours,
  updateChatSettings,
  updateCompanyTemplate,
  type InboxChannel,
  type InboxQuery,
} from '../api/inbox';
import type {
  BroadcastDriversBody,
  CreateClaimFromConversationBody,
  CreateCompanyTemplateBody,
  InboxConversation,
  OpenStaffConversationBody,
  UpdateChatBusinessHoursBody,
  UpdateChatSettingsBody,
  UpdateCompanyTemplateBody,
} from '../api/types';
import type { ThreadBinding } from './chatSources';
import { queryKeys } from './queryKeys';

const root = queryKeys.inbox.all;

/** Claves de la bandeja. Los hilos viven en `chatKeys.thread` (los maneja `useThread`, igual que el chat de soporte). */
export const inboxKeys = {
  all: root,
  list: (params: InboxQuery) => [...root, 'list', params] as const,
  detail: (conversationId: string) => [...root, 'detail', conversationId] as const,
  /** Las insignias (menú y pestañas): una sola consulta para todo el panel. */
  summary: () => [...root, 'summary'] as const,
  assignees: (conversationId: string) => [...root, 'assignees', conversationId] as const,
  settings: () => [...root, 'settings'] as const,
  hours: () => [...root, 'hours'] as const,
  templates: (params: object = {}) => [...root, 'templates', params] as const,
  /** Por el último mensaje de la persona que tiene el hilo: uno nuevo del cliente o del chofer pide otras. */
  suggestions: (conversationId: string, lastSeq: number) => [...root, 'suggestions', conversationId, lastSeq] as const,
  /** El resumen de la encuesta de satisfacción (último mes). */
  csat: () => [...root, 'csat'] as const,
  /** El catálogo de etiquetas de la empresa (7c). */
  labels: () => [...root, 'labels'] as const,
};

/** Relee listas, fichas y contadores de la bandeja (los hilos se ponen al día por `seq`, no se releen). */
export const invalidateInbox = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: root,
    predicate: (query) =>
      !['settings', 'hours', 'templates', 'suggestions', 'assignees', 'csat', 'labels'].includes(
        String(query.queryKey[1]),
      ),
  });

/** Cada cuánto se relee el resumen aunque el socket esté callado (red caída sin aviso). */
export const INBOX_POLL_MS = 60_000;

export const useInboxConversations = (params: InboxQuery, enabled = true) =>
  useQuery({
    queryKey: inboxKeys.list(params),
    queryFn: () => listConversations(params),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useInboxConversation = (conversationId: string | undefined) =>
  useQuery({
    queryKey: inboxKeys.detail(conversationId ?? ''),
    queryFn: () => getConversation(conversationId ?? ''),
    enabled: Boolean(conversationId),
    retry: false,
  });

/**
 * El resumen de la bandeja (sin asignar, mías, esperando a una persona, con algo sin leer) para la insignia del menú,
 * las pestañas y el título de la pestaña del navegador. Se relee con cada aviso del socket (`invalidateInbox`) y, de
 * respaldo, cada minuto.
 */
export const useInboxSummary = (enabled: boolean) =>
  useQuery({
    queryKey: inboxKeys.summary(),
    queryFn: getInboxSummary,
    enabled,
    refetchInterval: INBOX_POLL_MS,
  });

/** A quién se le puede asignar la conversación (sólo mientras el modal está abierto). */
export const useConversationAssignees = (conversationId: string | undefined) =>
  useQuery({
    queryKey: inboxKeys.assignees(conversationId ?? ''),
    queryFn: () => listConversationAssignees(conversationId ?? ''),
    enabled: Boolean(conversationId),
    retry: false,
  });

/** Deja la ficha que devolvió la API en su caché y relee el resto de la bandeja. */
const useConversationMutation = <V>(fn: (vars: V) => Promise<InboxConversation>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (conversation) => {
      queryClient.setQueryData(inboxKeys.detail(conversation.id), conversation);
    },
    onSettled: () => invalidateInbox(queryClient),
  });
};

export const useAssignConversation = () =>
  useConversationMutation(({ id, userId }: { id: string; userId: string | null }) => assignConversation(id, userId));

export const useCloseConversation = () => useConversationMutation((id: string) => closeConversation(id));

export const useReopenConversation = () => useConversationMutation((id: string) => reopenConversation(id));

export const useClaimFromConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateClaimFromConversationBody }) =>
      createClaimFromConversation(id, body),
    onSuccess: ({ conversation }) => {
      queryClient.setQueryData(inboxKeys.detail(conversation.id), conversation);
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
    onSettled: () => invalidateInbox(queryClient),
  });
};

/** Escribirle a un cliente o a un chofer desde su ficha, la del pedido o la bandeja. */
export const useOpenConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OpenStaffConversationBody) => openConversation(body),
    onSuccess: ({ conversation }) => {
      queryClient.setQueryData(inboxKeys.detail(conversation.id), conversation);
    },
    onSettled: () => invalidateInbox(queryClient),
  });
};

export const useBroadcastDrivers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BroadcastDriversBody) => broadcastDrivers(body),
    onSettled: () => invalidateInbox(queryClient),
  });
};

/**
 * El hilo de una conversación de la bandeja, listo para `ChatThread`: lee, escribe (con cita o respuesta guardada) y
 * edita por la API de la bandeja; los mensajes se llevan a la forma común del hilo.
 */
export const useInboxThread = (conversationId: string): ThreadBinding => {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      source: {
        conversationId,
        fetch: async (query) => {
          const page = await listConversationMessages(conversationId, query);
          return { items: page.items.map(toChatMessage), hasMore: page.hasMore };
        },
        send: async ({ clientMessageId, body, replyToSeq, templateId, visibility, mentions }) => {
          // Una nota interna va por su propio endpoint: nunca por el de los mensajes que ve el cliente o el chofer.
          if (visibility === 'internal') {
            const note = await sendConversationNote(conversationId, {
              clientMessageId,
              body,
              ...(mentions?.length ? { mentions } : {}),
            });
            void invalidateInbox(queryClient);
            return toChatMessage(note);
          }
          // Con una respuesta guardada va sólo su id: el back completa las variables (`body` y `templateId` juntos → 400).
          const message = await sendConversationMessage(conversationId, {
            clientMessageId,
            ...(templateId ? { templateId } : { body }),
            ...(replyToSeq ? { replyToSeq } : {}),
          });
          // La primera respuesta cambia la ficha (primera respuesta, contadores).
          void invalidateInbox(queryClient);
          return toChatMessage(message);
        },
        edit: async (messageId, body) => toChatMessage(await editConversationMessage(conversationId, messageId, body)),
        attachments: {
          channel: 'inbox',
          upload: async (input, onProgress) => {
            const message = await uploadConversationAttachment(conversationId, input, onProgress);
            // Como un texto: la primera respuesta y la vista previa de la lista («📎 Foto»).
            void invalidateInbox(queryClient);
            return toChatMessage(message);
          },
          link: (messageId) => getConversationAttachmentLink(conversationId, messageId),
        },
      },
      read: async (seq) => {
        await readConversation(conversationId, seq);
        // La insignia y el contador de la lista bajan en el acto (el socket lo confirma a las otras pestañas).
        void invalidateInbox(queryClient);
      },
    }),
    [conversationId, queryClient],
  );
};

/**
 * Marca leídas las menciones a quien mira en esa conversación (al abrirla): baja «Me mencionaron» y la insignia. Si
 * falla no se avisa: leer el hilo también las marca.
 */
export const useMarkMentionsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => markMentionsRead(conversationId),
    onSettled: () => invalidateInbox(queryClient),
  });
};

/** El resumen de la encuesta de satisfacción del último mes (la tarjeta de la configuración). */
export const useCsatSummary = (enabled = true) =>
  useQuery({
    queryKey: inboxKeys.csat(),
    queryFn: () => getCsatSummary(),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });

/**
 * Las sugerencias de respuesta para quien atiende: se piden de nuevo cuando llega otro mensaje del cliente o del chofer
 * (`lastSeq`). Mientras llegan las nuevas quedan las de antes de la misma conversación (no salta el compositor).
 */
export const useConversationSuggestions = (conversationId: string, lastSeq: number, enabled = true) =>
  useQuery({
    queryKey: inboxKeys.suggestions(conversationId, lastSeq),
    queryFn: () => getConversationSuggestions(conversationId),
    enabled,
    staleTime: 60_000,
    retry: false,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === conversationId ? previous : undefined,
  });

// ── Configuración ─────────────────────────────────────────────────────────────

/** Configuración de la bandeja (también `openNow` / `nextOpenAt` para el indicador «Fuera de horario»). */
export const useChatSettings = (enabled = true) =>
  useQuery({ queryKey: inboxKeys.settings(), queryFn: getChatSettings, enabled, staleTime: 60_000 });

export const useUpdateChatSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChatSettingsBody) => updateChatSettings(body),
    onSuccess: (settings) => {
      queryClient.setQueryData(inboxKeys.settings(), settings);
    },
  });
};

export const useBusinessHours = (enabled = true) =>
  useQuery({ queryKey: inboxKeys.hours(), queryFn: getBusinessHours, enabled });

export const useUpdateBusinessHours = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChatBusinessHoursBody) => updateBusinessHours(body),
    onSuccess: (hours) => {
      queryClient.setQueryData(inboxKeys.hours(), hours);
      // El horario cambia `openNow` de la configuración (el indicador de la bandeja).
      void queryClient.invalidateQueries({ queryKey: inboxKeys.settings() });
    },
  });
};

/** Respuestas guardadas: todas (configuración) o las activas de un canal (el `/` del compositor). */
export const useCompanyTemplates = (params: { channel?: InboxChannel; active?: boolean } = {}, enabled = true) =>
  useQuery({
    queryKey: inboxKeys.templates(params),
    queryFn: () => listCompanyTemplates(params),
    enabled,
    staleTime: 5 * 60_000,
  });

const useTemplateMutation = <V, R>(fn: (vars: V) => Promise<R>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Las sugerencias salen de las respuestas guardadas: un cambio también las vuelve a pedir.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...root, 'templates'] }),
        queryClient.invalidateQueries({ queryKey: [...root, 'suggestions'] }),
      ]),
  });
};

export const useCreateCompanyTemplate = () =>
  useTemplateMutation((body: CreateCompanyTemplateBody) => createCompanyTemplate(body));

export const useUpdateCompanyTemplate = () =>
  useTemplateMutation(({ id, body }: { id: string; body: UpdateCompanyTemplateBody }) =>
    updateCompanyTemplate(id, body),
  );

export const useDeleteCompanyTemplate = () => useTemplateMutation((id: string) => deleteCompanyTemplate(id));
