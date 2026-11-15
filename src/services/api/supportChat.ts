import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type {
  AddExcerptBody,
  CompanyPlatformChat,
  CompanySupportSummary,
  ConfirmTicketBody,
  Conversation,
  ConversationList,
  CreateCompanyTicketBody,
  CreatePlatformTicketBody,
  MessageDto,
  MessageList,
  MessageTemplateList,
  OpenTicketFromChatBody,
  PlatformChatList,
  PlatformOpenTicketFromChatBody,
  PlatformSupportSummary,
  PlatformTicketList,
  PlatformTicketMessageBody,
  SendMessageBody,
  StartPlatformChatBody,
  SupportSettings,
  Ticket,
  TicketList,
  UpdateSupportSettingsBody,
  UpdateTicketBody,
} from './types';

/**
 * Chat con la plataforma y tickets de soporte (C1, `splg-docs/sistema/DISENO-COMUNICACION.md` §14.4 y §14.5). Se
 * escribe por HTTP y se recibe por el socket del panel (`useSupportChatBridge`). Las llamadas de la empresa usan el
 * tenant de su perfil; las de la plataforma no leen distribuidora.
 */
const V2 = { baseURL: env.apiUrlV2 } as const;

export type TicketStatus = Ticket['status'];
export type TicketPriority = Ticket['priority'];
export type TicketCategory = Ticket['category'];
export type ChatParty = MessageDto['party'];

/** Largo del texto de un mensaje que acepta la API (`SendMessageDto.body`). */
export const MESSAGE_MAX = 2000;
/** Largo del asunto de un ticket (`CreateCompanyTicketDto.subject`). */
export const SUBJECT_MIN = 5;
export const SUBJECT_MAX = 120;
/** Cuántos mensajes del chat se pueden citar en un ticket (`TICKET_EXCERPT_INVALID`). */
export const EXCERPT_MAX = 200;
/** Página de mensajes: la API acepta 1–100 y da 50 por defecto. */
export const MESSAGES_PAGE = 50;
export const MESSAGES_PAGE_MAX = 100;

/** Una página de mensajes por número: los posteriores a `afterSeq`, los anteriores a `beforeSeq` o los últimos. */
export interface MessagesQuery {
  afterSeq?: number;
  beforeSeq?: number;
  limit?: number;
}

export interface ListQuery {
  limit: number;
  offset: number;
}

const id = (value: string) => encodeURIComponent(value);

// ── Empresa: chat con la plataforma ───────────────────────────────────────────

/** GET /v2/company/platform-chat: el chat abierto (o `null`) con los tickets que salieron de él. */
export const getCompanyChat = async (): Promise<CompanyPlatformChat> => {
  const { data } = await http.get<CompanyPlatformChat>('/company/platform-chat', V2);
  return data;
};

/** GET /v2/company/platform-chat/history: los chats cerrados, los más recientes primero. */
export const listCompanyChatHistory = async (params: ListQuery): Promise<ConversationList> => {
  const { data } = await http.get<ConversationList>('/company/platform-chat/history', { ...V2, params });
  return data;
};

/** POST /v2/company/platform-chat/messages: en el chat abierto o en uno nuevo. El mismo `clientMessageId` no duplica. */
export const sendCompanyChatMessage = async (body: SendMessageBody): Promise<MessageDto> => {
  const { data } = await http.post<MessageDto>('/company/platform-chat/messages', body, V2);
  return data;
};

export const listCompanyChatMessages = async (conversationId: string, params: MessagesQuery): Promise<MessageList> => {
  const { data } = await http.get<MessageList>(`/company/platform-chat/${id(conversationId)}/messages`, {
    ...V2,
    params,
  });
  return data;
};

export const readCompanyChat = async (conversationId: string, seq: number): Promise<void> => {
  await http.post(`/company/platform-chat/${id(conversationId)}/read`, { seq }, V2);
};

export const openTicketFromCompanyChat = async (
  conversationId: string,
  body: OpenTicketFromChatBody,
  key: string,
): Promise<Ticket> => {
  const { data } = await http.post<Ticket>(`/company/platform-chat/${id(conversationId)}/tickets`, body, {
    ...V2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** GET /v2/company/support/summary: la insignia «Ayuda» (sin leer en el chat y tickets con algo sin leer). */
export const getCompanySupportSummary = async (): Promise<CompanySupportSummary> => {
  const { data } = await http.get<CompanySupportSummary>('/company/support/summary', V2);
  return data;
};

// ── Empresa: tickets ──────────────────────────────────────────────────────────

export const listCompanyTickets = async (params: ListQuery & { status?: TicketStatus }): Promise<TicketList> => {
  const { data } = await http.get<TicketList>('/company/tickets', { ...V2, params });
  return data;
};

export const createCompanyTicket = async (body: CreateCompanyTicketBody): Promise<Ticket> => {
  const { data } = await http.post<Ticket>('/company/tickets', body, V2);
  return data;
};

export const getCompanyTicket = async (ticketId: string): Promise<Ticket> => {
  const { data } = await http.get<Ticket>(`/company/tickets/${id(ticketId)}`, V2);
  return data;
};

export const listCompanyTicketMessages = async (ticketId: string, params: MessagesQuery): Promise<MessageList> => {
  const { data } = await http.get<MessageList>(`/company/tickets/${id(ticketId)}/messages`, { ...V2, params });
  return data;
};

export const sendCompanyTicketMessage = async (ticketId: string, body: SendMessageBody): Promise<MessageDto> => {
  const { data } = await http.post<MessageDto>(`/company/tickets/${id(ticketId)}/messages`, body, V2);
  return data;
};

export const addCompanyTicketExcerpt = async (ticketId: string, body: AddExcerptBody, key: string) => {
  const { data } = await http.post<MessageDto>(`/company/tickets/${id(ticketId)}/excerpts`, body, {
    ...V2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

export const readCompanyTicket = async (ticketId: string, seq: number): Promise<void> => {
  await http.post(`/company/tickets/${id(ticketId)}/read`, { seq }, V2);
};

/** POST /v2/company/tickets/:id/confirm: cierra un ticket resuelto, con la calificación opcional. */
export const confirmCompanyTicket = async (ticketId: string, body: ConfirmTicketBody, key: string) => {
  const { data } = await http.post<Ticket>(`/company/tickets/${id(ticketId)}/confirm`, body, {
    ...V2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

// ── Plataforma: chats con las empresas ────────────────────────────────────────

export interface PlatformChatsQuery extends ListQuery {
  status?: Conversation['status'];
  /** `me`, `none` o el id de un miembro. */
  assigned?: string;
  distributorId?: string;
}

export const listPlatformChats = async (params: PlatformChatsQuery): Promise<PlatformChatList> => {
  const { data } = await http.get<PlatformChatList>('/platform/chats', { ...V2, params });
  return data;
};

/** POST /v2/platform/chats: escribirle a una empresa (su chat abierto o uno nuevo, atendido por quien escribe). */
export const startPlatformChat = async (body: StartPlatformChatBody): Promise<MessageDto> => {
  const { data } = await http.post<MessageDto>('/platform/chats', body, V2);
  return data;
};

export const getPlatformChat = async (conversationId: string): Promise<Conversation> => {
  const { data } = await http.get<Conversation>(`/platform/chats/${id(conversationId)}`, V2);
  return data;
};

export const listPlatformChatMessages = async (conversationId: string, params: MessagesQuery) => {
  const { data } = await http.get<MessageList>(`/platform/chats/${id(conversationId)}/messages`, { ...V2, params });
  return data;
};

export const sendPlatformChatMessage = async (conversationId: string, body: SendMessageBody) => {
  const { data } = await http.post<MessageDto>(`/platform/chats/${id(conversationId)}/messages`, body, V2);
  return data;
};

export const readPlatformChat = async (conversationId: string, seq: number): Promise<void> => {
  await http.post(`/platform/chats/${id(conversationId)}/read`, { seq }, V2);
};

export type PlatformChatAction = 'take' | 'release' | 'close';

/** POST /v2/platform/chats/:id/take | release | close. */
export const actOnPlatformChat = async (conversationId: string, action: PlatformChatAction): Promise<Conversation> => {
  const { data } = await http.post<Conversation>(`/platform/chats/${id(conversationId)}/${action}`, {}, V2);
  return data;
};

export const openTicketFromPlatformChat = async (
  conversationId: string,
  body: PlatformOpenTicketFromChatBody,
  key: string,
): Promise<Ticket> => {
  const { data } = await http.post<Ticket>(`/platform/chats/${id(conversationId)}/tickets`, body, {
    ...V2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** GET /v2/platform/support/summary: chats y tickets con algo sin leer, y los que nadie atiende. */
export const getPlatformSupportSummary = async (): Promise<PlatformSupportSummary> => {
  const { data } = await http.get<PlatformSupportSummary>('/platform/support/summary', V2);
  return data;
};

/** GET /v2/platform/support-settings: el horario de atención (`openNow`) y los objetivos. */
export const getSupportSettings = async (): Promise<SupportSettings> => {
  const { data } = await http.get<SupportSettings>('/platform/support-settings', V2);
  return data;
};

/**
 * PUT /v2/platform/support-settings: lo que no viene queda como estaba y devuelve todo. Incluye el asistente con IA del
 * soporte y sus topes (respuestas por conversación 1–50; tokens por mes 10.000–1.000.000.000).
 */
export const updateSupportSettings = async (body: UpdateSupportSettingsBody): Promise<SupportSettings> => {
  const { data } = await http.put<SupportSettings>('/platform/support-settings', body, V2);
  return data;
};

/** Topes del asistente con IA (`UpdateSupportSettingsDto`). */
export const ASSISTANT_REPLIES_MIN = 1;
export const ASSISTANT_REPLIES_MAX = 50;
export const ASSISTANT_TOKENS_MIN = 10_000;
export const ASSISTANT_TOKENS_MAX = 1_000_000_000;

/** GET /v2/platform/ticket-templates?scope=platform_reply: las respuestas rápidas del soporte. */
export const listQuickReplies = async (): Promise<MessageTemplateList> => {
  const { data } = await http.get<MessageTemplateList>('/platform/ticket-templates', {
    ...V2,
    params: { scope: 'platform_reply' },
  });
  return data;
};

// ── Plataforma: tickets ───────────────────────────────────────────────────────

export interface PlatformTicketsQuery extends ListQuery {
  status?: TicketStatus;
  priority?: TicketPriority;
  distributorId?: string;
  assigned?: string;
  overdue?: boolean;
  fromChat?: boolean;
  q?: string;
}

export const listPlatformTickets = async (params: PlatformTicketsQuery): Promise<PlatformTicketList> => {
  const { data } = await http.get<PlatformTicketList>('/platform/tickets', { ...V2, params });
  return data;
};

export const createPlatformTicket = async (body: CreatePlatformTicketBody): Promise<Ticket> => {
  const { data } = await http.post<Ticket>('/platform/tickets', body, V2);
  return data;
};

export const getPlatformTicket = async (ticketId: string): Promise<Ticket> => {
  const { data } = await http.get<Ticket>(`/platform/tickets/${id(ticketId)}`, V2);
  return data;
};

export const listPlatformTicketMessages = async (ticketId: string, params: MessagesQuery) => {
  const { data } = await http.get<MessageList>(`/platform/tickets/${id(ticketId)}/messages`, { ...V2, params });
  return data;
};

export const sendPlatformTicketMessage = async (ticketId: string, body: PlatformTicketMessageBody) => {
  const { data } = await http.post<MessageDto>(`/platform/tickets/${id(ticketId)}/messages`, body, V2);
  return data;
};

export const addPlatformTicketExcerpt = async (ticketId: string, body: AddExcerptBody, key: string) => {
  const { data } = await http.post<MessageDto>(`/platform/tickets/${id(ticketId)}/excerpts`, body, {
    ...V2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

export const readPlatformTicket = async (ticketId: string, seq: number): Promise<void> => {
  await http.post(`/platform/tickets/${id(ticketId)}/read`, { seq }, V2);
};

/** PATCH /v2/platform/tickets/:id: estado (según la máquina), prioridad, asignado o categoría. */
export const updatePlatformTicket = async (ticketId: string, body: UpdateTicketBody): Promise<Ticket> => {
  const { data } = await http.patch<Ticket>(`/platform/tickets/${id(ticketId)}`, body, V2);
  return data;
};

// ── Filtros por grupo de estados (la API filtra por un estado por vez) ───────

/** Los grupos del filtro de los listados: «Activos» junta tres estados de la API. */
export type TicketStatusGroup = 'active' | 'resolved' | 'closed' | 'all';
export const ACTIVE_STATUSES: TicketStatus[] = ['new', 'open', 'waiting_company'];

/** Los estados que pide cada grupo; `null` = sin filtro (la API devuelve todos). */
export const statusesOf = (group: TicketStatusGroup): TicketStatus[] | null =>
  group === 'active' ? ACTIVE_STATUSES : group === 'all' ? null : [group];

/** Tope de tickets que se juntan del lado del panel (para «Activos» y la búsqueda de la empresa). */
export const COLLECT_MAX = 500;

interface TicketPage<T> {
  items: T[];
  total: number;
}

/** Junta las páginas de un listado hasta tener `needed` (o hasta que no haya más), de a 100. */
export const collectPages = async <T>(
  fetchPage: (limit: number, offset: number) => Promise<TicketPage<T>>,
  needed: number,
): Promise<TicketPage<T>> => {
  const items: T[] = [];
  let total = 0;
  for (let offset = 0; offset < Math.min(needed, COLLECT_MAX); offset += MESSAGES_PAGE_MAX) {
    const page = await fetchPage(MESSAGES_PAGE_MAX, offset);
    total = page.total;
    items.push(...page.items);
    if (items.length >= total || page.items.length === 0) break;
  }
  return { items, total };
};

/**
 * Junta listados ya ordenados por la API (los movidos más recientemente primero) en uno solo con el mismo orden, sin
 * repetidos, y corta la página pedida. El total es la suma de los totales.
 */
export const mergeByRecent = <T extends { id: string; updatedAt: string }>(
  lists: TicketPage<T>[],
  offset: number,
  limit: number,
): TicketPage<T> => {
  const seen = new Set<string>();
  const all = lists
    .flatMap((l) => l.items)
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  // Cantidad de tickets (no plata): la suma de lo que informó cada listado.
  let count = 0;
  for (const n of lists.map((list) => list.total)) count += n;
  return { items: all.slice(offset, offset + limit), total: count };
};

/** Búsqueda por número (`T-000123` o `123`) o por parte del asunto, como la de la API de la plataforma. */
export const matchesTicket = (ticket: { number: string; subject: string }, q: string): boolean => {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  const digits = term.replace(/^t-?/, '');
  if (/^\d+$/.test(digits)) return Number(ticket.number.replace(/\D/g, '')) === Number(digits);
  return ticket.subject.toLowerCase().includes(term) || ticket.number.toLowerCase().includes(term);
};

export interface CompanyTicketsQuery extends ListQuery {
  group: TicketStatusGroup;
  q?: string;
}

/**
 * Los tickets de la empresa por grupo de estados y búsqueda. La API de la empresa filtra por un solo estado y no
 * busca: «Activos» pide sus tres estados y los junta; con búsqueda se juntan hasta 500 y se filtra acá.
 */
export const listCompanyTicketsBy = async ({ group, q, limit, offset }: CompanyTicketsQuery): Promise<TicketList> => {
  const statuses = statusesOf(group);
  const term = q?.trim() ?? '';
  if (!term && (statuses === null || statuses.length === 1)) {
    return listCompanyTickets({ limit, offset, status: statuses?.[0] });
  }
  const needed = term ? COLLECT_MAX : offset + limit;
  const lists = await Promise.all(
    (statuses ?? [undefined]).map((status) =>
      collectPages((l, o) => listCompanyTickets({ limit: l, offset: o, status }), needed),
    ),
  );
  if (!term) return mergeByRecent(lists, offset, limit);
  const found = mergeByRecent(lists, 0, COLLECT_MAX).items.filter((t) => matchesTicket(t, term));
  return { items: found.slice(offset, offset + limit), total: found.length };
};

const isStatusGroup = (value: string): value is TicketStatusGroup =>
  value === 'active' || value === 'resolved' || value === 'closed' || value === 'all';

export interface PlatformTicketsByQuery extends Omit<PlatformTicketsQuery, 'status'> {
  group: TicketStatusGroup | TicketStatus;
}

/** La cola de la plataforma con «Activos» (tres estados juntos); el resto lo filtra la API. */
export const listPlatformTicketsBy = async ({
  group,
  limit,
  offset,
  ...filters
}: PlatformTicketsByQuery): Promise<PlatformTicketList> => {
  const statuses = isStatusGroup(group) ? statusesOf(group) : [group];
  if (statuses === null || statuses.length === 1) {
    return listPlatformTickets({ ...filters, limit, offset, status: statuses?.[0] });
  }
  // `counts` no depende de los filtros: sale de cualquiera de las respuestas.
  let counts: PlatformTicketList['counts'] | undefined;
  const pages = await Promise.all(
    statuses.map((status) =>
      collectPages(async (l, o) => {
        const page = await listPlatformTickets({ ...filters, status, limit: l, offset: o });
        counts = page.counts;
        return page;
      }, offset + limit),
    ),
  );
  if (!counts) counts = (await listPlatformTickets({ ...filters, limit: 1, offset: 0 })).counts;
  return { ...mergeByRecent(pages, offset, limit), counts };
};

/**
 * PATCH /v2/platform/tickets/:id con `assignedTo` (un administrador general o `null` para desasignar). Va aparte
 * porque el Swagger del back declara `assignedTo` como objeto (le falta `type: String` en `UpdateTicketDto`): el
 * tipo generado no acepta el id. Arreglado el back y regenerados los tipos, esto vuelve a `updatePlatformTicket`.
 */
export const assignPlatformTicket = async (ticketId: string, userId: string | null): Promise<Ticket> => {
  const { data } = await http.patch<Ticket>(`/platform/tickets/${id(ticketId)}`, { assignedTo: userId }, V2);
  return data;
};
