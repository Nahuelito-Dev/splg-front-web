import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  actOnPlatformChat,
  assignPlatformTicket,
  addCompanyTicketExcerpt,
  addPlatformTicketExcerpt,
  confirmCompanyTicket,
  createCompanyTicket,
  createPlatformTicket,
  getCompanyChat,
  getCompanySupportSummary,
  getCompanyTicket,
  getPlatformChat,
  getPlatformSupportSummary,
  getPlatformTicket,
  getSupportSettings,
  listCompanyChatHistory,
  listCompanyTicketsBy,
  listCompanyTicketMessages,
  listPlatformTicketMessages,
  MESSAGES_PAGE_MAX,
  listPlatformChats,
  listPlatformTicketsBy,
  listQuickReplies,
  openTicketFromCompanyChat,
  openTicketFromPlatformChat,
  startPlatformChat,
  updatePlatformTicket,
  type ListQuery,
  type PlatformChatAction,
  type PlatformChatsQuery,
  type CompanyTicketsQuery,
  type PlatformTicketsByQuery,
} from '../api/supportChat';
import { clearIntent, intentKey } from '../api/idempotency';
import type {
  AddExcerptBody,
  CreateCompanyTicketBody,
  CreatePlatformTicketBody,
  MessageDto,
  OpenTicketFromChatBody,
  PlatformOpenTicketFromChatBody,
  StartPlatformChatBody,
  Ticket,
  UpdateTicketBody,
} from '../api/types';
import { queryKeys } from './queryKeys';

/** De qué lado del chat está quien mira: la empresa (su ayuda) o la plataforma (el soporte). */
export type ChatSide = 'company' | 'platform';

const root = queryKeys.supportChat.all;

/** Claves del chat con la plataforma y los tickets. Los hilos (`thread`) los maneja `useThread`, no se invalidan. */
export const chatKeys = {
  all: root,
  companyChat: () => [...root, 'companyChat'] as const,
  companyHistory: (params: ListQuery) => [...root, 'companyHistory', params] as const,
  summary: (side: ChatSide) => [...root, 'summary', side] as const,
  platformChats: (params: object = {}) => [...root, 'platformChats', params] as const,
  platformChat: (id: string) => [...root, 'platformChat', id] as const,
  tickets: (side: ChatSide, params: object = {}) => [...root, 'tickets', side, params] as const,
  ticket: (side: ChatSide, id: string) => [...root, 'ticket', side, id] as const,
  thread: (conversationId: string) => [...root, 'thread', conversationId] as const,
  quickReplies: () => [...root, 'quickReplies'] as const,
  settings: () => [...root, 'settings'] as const,
  ticketHistory: (side: ChatSide, id: string) => [...root, 'ticketHistory', side, id] as const,
};

/**
 * Refresca lo que se lista (chats, tickets, contadores, el chat abierto) sin tocar los hilos: un hilo se pone al día
 * pidiendo lo posterior a su último número, no releyéndolo entero.
 */
export const invalidateChatLists = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: root,
    predicate: (query) => query.queryKey[1] !== 'thread',
  });

// ── Contadores ────────────────────────────────────────────────────────────────

/** Cada cuánto se relee el contador aunque el socket esté callado (red caída sin aviso). */
export const SUMMARY_POLL_MS = 60_000;

/** La insignia «Ayuda» de la empresa: sin leer en el chat + tickets con algo sin leer. */
export const useCompanySupportSummary = (enabled: boolean) =>
  useQuery({
    queryKey: chatKeys.summary('company'),
    queryFn: getCompanySupportSummary,
    enabled,
    refetchInterval: SUMMARY_POLL_MS,
  });

export const usePlatformSupportSummary = (enabled: boolean) =>
  useQuery({
    queryKey: chatKeys.summary('platform'),
    queryFn: getPlatformSupportSummary,
    enabled,
    refetchInterval: SUMMARY_POLL_MS,
  });

// ── Empresa ───────────────────────────────────────────────────────────────────

/** El chat abierto con la plataforma (o `null`) y los tickets que salieron de él. */
export const useCompanyChat = (enabled = true) =>
  useQuery({ queryKey: chatKeys.companyChat(), queryFn: getCompanyChat, enabled });

export const useCompanyChatHistory = (params: ListQuery, enabled = true) =>
  useQuery({
    queryKey: chatKeys.companyHistory(params),
    queryFn: () => listCompanyChatHistory(params),
    enabled,
    placeholderData: keepPreviousData,
  });

/** Los tickets de la empresa por grupo de estados («Activos», «Resueltos», «Cerrados», «Todos») y búsqueda. */
export const useCompanyTickets = (params: CompanyTicketsQuery) =>
  useQuery({
    queryKey: chatKeys.tickets('company', params),
    queryFn: () => listCompanyTicketsBy(params),
    placeholderData: keepPreviousData,
  });

export const useCompanyTicket = (id: string | undefined) =>
  useQuery({
    queryKey: chatKeys.ticket('company', id ?? ''),
    queryFn: () => getCompanyTicket(id ?? ''),
    enabled: Boolean(id),
    retry: false,
  });

export const useCreateCompanyTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCompanyTicketBody) => createCompanyTicket(body),
    onSettled: () => invalidateChatLists(queryClient),
  });
};

/** Confirmar un ticket resuelto (y calificarlo). La clave de idempotencia es la de esa calificación. */
export const useConfirmCompanyTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, satisfaction }: { id: string; satisfaction?: number }) => {
      const scope = `ticket-confirm:${id}`;
      const body = satisfaction ? { satisfaction } : {};
      const ticket = await confirmCompanyTicket(id, body, intentKey(scope, body));
      clearIntent(scope);
      return ticket;
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(chatKeys.ticket('company', ticket.id), ticket);
    },
    onSettled: () => invalidateChatLists(queryClient),
  });
};

// ── Abrir un ticket desde el chat y llevarle más mensajes (los dos lados) ────

/** Del lado de la plataforma se puede pedir que quede asignado a quien lo abre. */
type OpenFromChatBody = OpenTicketFromChatBody & Partial<Pick<PlatformOpenTicketFromChatBody, 'assignToMe'>>;

/** Abre un ticket con los mensajes `fromSeq`–`toSeq` del chat. Un reintento con los mismos datos no lo duplica. */
export const useOpenTicketFromChat = (side: ChatSide) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: OpenFromChatBody }) => {
      const scope = `ticket-from-chat:${conversationId}`;
      const key = intentKey(scope, body);
      const ticket =
        side === 'company'
          ? await openTicketFromCompanyChat(conversationId, body, key)
          : await openTicketFromPlatformChat(conversationId, { ...body, assignToMe: body.assignToMe ?? false }, key);
      clearIntent(scope);
      return ticket;
    },
    onSuccess: (ticket: Ticket) => {
      queryClient.setQueryData(chatKeys.ticket(side, ticket.id), ticket);
    },
    onSettled: () => invalidateChatLists(queryClient),
  });
};

export const useAddTicketExcerpt = (side: ChatSide) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: AddExcerptBody }) => {
      const scope = `ticket-excerpt:${ticketId}`;
      const key = intentKey(scope, body);
      const message =
        side === 'company'
          ? await addCompanyTicketExcerpt(ticketId, body, key)
          : await addPlatformTicketExcerpt(ticketId, body, key);
      clearIntent(scope);
      return message;
    },
    onSettled: () => invalidateChatLists(queryClient),
  });
};

// ── Plataforma ────────────────────────────────────────────────────────────────

export const usePlatformChats = (params: PlatformChatsQuery) =>
  useQuery({
    queryKey: chatKeys.platformChats(params),
    queryFn: () => listPlatformChats(params),
    placeholderData: keepPreviousData,
  });

export const usePlatformChat = (id: string | undefined) =>
  useQuery({
    queryKey: chatKeys.platformChat(id ?? ''),
    queryFn: () => getPlatformChat(id ?? ''),
    enabled: Boolean(id),
    retry: false,
  });

/** Tomar, soltar o cerrar un chat. Un 409 (otra persona lo tomó, ya estaba cerrado) refresca igual. */
export const usePlatformChatAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: PlatformChatAction }) => actOnPlatformChat(id, action),
    onSuccess: (conversation) => {
      queryClient.setQueryData(chatKeys.platformChat(conversation.id), conversation);
    },
    onSettled: () => invalidateChatLists(queryClient),
  });
};

export const useStartPlatformChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StartPlatformChatBody) => startPlatformChat(body),
    onSettled: () => invalidateChatLists(queryClient),
  });
};

export const usePlatformTickets = (params: PlatformTicketsByQuery) =>
  useQuery({
    queryKey: chatKeys.tickets('platform', params),
    queryFn: () => listPlatformTicketsBy(params),
    placeholderData: keepPreviousData,
  });

export const usePlatformTicket = (id: string | undefined) =>
  useQuery({
    queryKey: chatKeys.ticket('platform', id ?? ''),
    queryFn: () => getPlatformTicket(id ?? ''),
    enabled: Boolean(id),
    retry: false,
  });

export const useCreatePlatformTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePlatformTicketBody) => createPlatformTicket(body),
    onSettled: () => invalidateChatLists(queryClient),
  });
};

/** Cambios de la plataforma sobre un ticket; `assignedTo` (un id o `null`) va por su llamada propia. */
export type TicketChange = Omit<UpdateTicketBody, 'assignedTo'> & { assignedTo?: string | null };

export const useUpdatePlatformTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TicketChange }) => {
      const { assignedTo, ...rest } = body;
      return assignedTo !== undefined ? assignPlatformTicket(id, assignedTo) : updatePlatformTicket(id, rest);
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(chatKeys.ticket('platform', ticket.id), ticket);
    },
    onSettled: () => invalidateChatLists(queryClient),
  });
};

/** Respuestas rápidas del soporte (las abre `/` en el compositor). Cambian poco. */
export const useQuickReplies = (enabled: boolean) =>
  useQuery({ queryKey: chatKeys.quickReplies(), queryFn: listQuickReplies, enabled, staleTime: 5 * 60_000 });

/** El horario de atención de la plataforma (`openNow`), para el indicador del chat. */
export const useSupportSettings = (enabled: boolean) =>
  useQuery({ queryKey: chatKeys.settings(), queryFn: getSupportSettings, enabled, staleTime: 60_000 });

/** Tope de mensajes que se leen para armar la línea de tiempo de un ticket. */
const HISTORY_MAX = 2000;

/**
 * El hilo entero de un ticket, para la línea de tiempo (los cambios de estado son mensajes de sistema y pueden haber
 * quedado antes de la última página). Del lado de la plataforma trae también las notas internas; la empresa nunca.
 */
export const useTicketHistory = (side: ChatSide, ticketId: string) =>
  useQuery({
    queryKey: chatKeys.ticketHistory(side, ticketId),
    queryFn: async () => {
      const list = side === 'company' ? listCompanyTicketMessages : listPlatformTicketMessages;
      const items: MessageDto[] = [];
      let after = 0;
      while (items.length < HISTORY_MAX) {
        const page = await list(ticketId, { afterSeq: after, limit: MESSAGES_PAGE_MAX });
        items.push(...page.items);
        if (!page.hasMore || page.items.length === 0) break;
        after = page.items[page.items.length - 1].seq;
      }
      return items;
    },
  });
