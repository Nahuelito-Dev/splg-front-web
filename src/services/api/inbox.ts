import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  BroadcastDriversBody,
  Broadcast,
  ChatBusinessHours,
  ChatSettings,
  ClaimFromConversation,
  CompanyTemplate,
  CompanyTemplateList,
  CreateClaimFromConversationBody,
  CreateCompanyTemplateBody,
  InboxAssigneeList,
  InboxConversation,
  InboxList,
  InboxMessage,
  InboxMessageList,
  InboxSuggestions,
  InboxSummary,
  OpenConversation,
  OpenStaffConversationBody,
  SendStaffMessageBody,
  UpdateChatBusinessHoursBody,
  UpdateChatSettingsBody,
  UpdateCompanyTemplateBody,
} from './types';
import type { MessagesQuery } from './supportChat';

/**
 * La bandeja de la empresa con sus clientes (C3) y sus choferes (C2), `splg-docs/sistema/back/MENSAJES.md` (CH3). Se
 * escribe por HTTP y se recibe por el socket del panel (`useInboxBridge`). Todo con la empresa del perfil y el módulo
 * `chat`: apagado, la API responde 403 `MODULE_DISABLED`.
 */
const V2 = { baseURL: env.apiUrlV2 } as const;

export type InboxChannel = InboxConversation['channel'];
export type InboxParty = InboxMessage['party'];

/** Largo de la búsqueda que acepta la API (`q`: 3 a 100). */
export const INBOX_SEARCH_MIN = 3;
export const INBOX_SEARCH_MAX = 100;
/** Choferes por aviso (`BroadcastDriversDto.driverIds`). */
export const BROADCAST_MAX = 50;
/** Reclamo desde el hilo (`CreateClaimFromConversationDto`). */
export const CLAIM_REASON_MAX = 120;
export const CLAIM_DESCRIPTION_MAX = 1000;
/** Respuestas guardadas (`CreateCompanyTemplateDto`). */
export const TEMPLATE_KEY_MAX = 60;
export const TEMPLATE_TITLE_MIN = 2;
export const TEMPLATE_TITLE_MAX = 60;
export const TEMPLATE_BODY_MAX = 1000;
/** Textos de las respuestas automáticas (`UpdateChatSettingsDto`). */
export const AUTO_MESSAGE_MAX = 500;
export const FIRST_RESPONSE_MIN = 5;
export const FIRST_RESPONSE_MAX = 1440;
/** Nombre del asistente (`UpdateChatSettingsDto.assistantName`): de 2 a 60 caracteres, en una línea. */
export const ASSISTANT_NAME_MIN = 2;
export const ASSISTANT_NAME_MAX = 60;
/** La única variable que admite el nombre del asistente (es una firma: no depende de la conversación). */
export const ASSISTANT_NAME_VARIABLES = ['empresa.nombre'] as const;
/**
 * Los textos de omisión del back (`domain/bandeja.ts`). La API los devuelve en `effective*` mientras la empresa no
 * escribió uno propio; con uno propio guardado, son lo que vuelve si se borra (vista previa y ayuda del campo).
 */
export const DEFAULT_ASSISTANT_NAME = 'Asistente de {{empresa.nombre}}';
export const DEFAULT_HANDOFF_MESSAGE =
  'Te paso con alguien del equipo de {{empresa.nombre}}. Te va a responder a la brevedad.';
export const DEFAULT_OUT_OF_HOURS_MESSAGE = 'Ahora estamos fuera de horario. Te respondemos {{horario.proximo}}.';
export const DEFAULT_ACK_MESSAGE =
  'Recibimos tu mensaje. Alguien del equipo de {{empresa.nombre}} te va a atender a la brevedad.';
/** Motivo de un día sin atención (`ChatHolidayDto.reason`). */
export const HOLIDAY_REASON_MIN = 2;
export const HOLIDAY_REASON_MAX = 120;
/** Las variables que entiende el back en respuestas guardadas y automáticas (otra → 400 `TEMPLATE_VARIABLE_UNKNOWN`). */
export const TEMPLATE_VARIABLES = ['cliente.nombre', 'pedido.numero', 'empresa.nombre', 'horario.proximo'] as const;

export interface InboxQuery {
  channel?: InboxChannel;
  status?: 'open' | 'closed';
  /** `me`, `none` o el id de alguien del personal. */
  assigned?: string;
  customerId?: string;
  driverId?: string;
  orderId?: string;
  /** `true`: sólo las que el asistente pasó a una persona (`awaitingHumanSince`). */
  awaiting?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

const id = (value: string) => encodeURIComponent(value);

/** GET /v2/conversations: las de los canales que atiende quien pide, por el último mensaje, con los contadores. */
export const listConversations = async (params: InboxQuery): Promise<InboxList> => {
  const { data } = await http.get<InboxList>('/conversations', { ...V2, params });
  return data;
};

/**
 * GET /v2/conversations/summary: de las abiertas de los canales que atiende quien pide, cuántas están sin asignar, son
 * suyas, esperan a una persona y tienen algo sin leer para él (conversaciones, no mensajes). Las insignias.
 */
export const getInboxSummary = async (): Promise<InboxSummary> => {
  const { data } = await http.get<InboxSummary>('/conversations/summary', V2);
  return data;
};

/**
 * GET /v2/conversations/:id/assignees: el personal vigente que atiende el canal de esa conversación (la misma regla con
 * que valida `assign`), por nombre. 404 si no existe, es de otra empresa o de un canal que quien pide no atiende.
 */
export const listConversationAssignees = async (conversationId: string): Promise<InboxAssigneeList> => {
  const { data } = await http.get<InboxAssigneeList>(`/conversations/${id(conversationId)}/assignees`, V2);
  return data;
};

/** GET /v2/conversations/:id: 404 si es de otra empresa o de un canal que quien pide no atiende. */
export const getConversation = async (conversationId: string): Promise<InboxConversation> => {
  const { data } = await http.get<InboxConversation>(`/conversations/${id(conversationId)}`, V2);
  return data;
};

/**
 * POST /v2/conversations: escribirle a un cliente o a un chofer (general o por un pedido). Si ya hay una abierta del
 * mismo tema, el mensaje va ahí (200). El mismo `clientMessageId` no duplica.
 */
export const openConversation = async (body: OpenStaffConversationBody): Promise<OpenConversation> => {
  const { data } = await http.post<OpenConversation>('/conversations', body, V2);
  return data;
};

/** POST /v2/conversations/broadcast-drivers: el mismo mensaje en la general de cada chofer (1–50). */
export const broadcastDrivers = async (body: BroadcastDriversBody): Promise<Broadcast> => {
  const { data } = await http.post<Broadcast>('/conversations/broadcast-drivers', body, V2);
  return data;
};

export const listConversationMessages = async (
  conversationId: string,
  params: MessagesQuery,
): Promise<InboxMessageList> => {
  const { data } = await http.get<InboxMessageList>(`/conversations/${id(conversationId)}/messages`, {
    ...V2,
    params,
  });
  return data;
};

export const sendConversationMessage = async (
  conversationId: string,
  body: SendStaffMessageBody,
): Promise<InboxMessage> => {
  const { data } = await http.post<InboxMessage>(`/conversations/${id(conversationId)}/messages`, body, V2);
  return data;
};

/** PATCH …/messages/:messageId: editar un mensaje propio hasta 15 minutos después (D-C22). */
export const editConversationMessage = async (
  conversationId: string,
  messageId: string,
  body: string,
): Promise<InboxMessage> => {
  const { data } = await http.patch<InboxMessage>(
    `/conversations/${id(conversationId)}/messages/${id(messageId)}`,
    { body },
    V2,
  );
  return data;
};

/**
 * GET /v2/conversations/:id/suggestions: hasta 3 respuestas guardadas parecidas al último mensaje del cliente o del
 * chofer (`basedOnSeq`), con las variables ya completadas. Vacía si nada se parece. No manda nada.
 */
export const getConversationSuggestions = async (conversationId: string): Promise<InboxSuggestions> => {
  const { data } = await http.get<InboxSuggestions>(`/conversations/${id(conversationId)}/suggestions`, V2);
  return data;
};

/** POST …/assign: a alguien que atienda el canal; `null` la devuelve a la cola. Tomarla es asignársela a uno. */
export const assignConversation = async (conversationId: string, userId: string | null): Promise<InboxConversation> => {
  const { data } = await http.post<InboxConversation>(`/conversations/${id(conversationId)}/assign`, { userId }, V2);
  return data;
};

export const closeConversation = async (conversationId: string): Promise<InboxConversation> => {
  const { data } = await http.post<InboxConversation>(`/conversations/${id(conversationId)}/close`, undefined, V2);
  return data;
};

export const reopenConversation = async (conversationId: string): Promise<InboxConversation> => {
  const { data } = await http.post<InboxConversation>(`/conversations/${id(conversationId)}/reopen`, undefined, V2);
  return data;
};

export const readConversation = async (conversationId: string, seq: number): Promise<void> => {
  await http.post(`/conversations/${id(conversationId)}/read`, { seq }, V2);
};

/** POST …/claim: el reclamo desde el hilo (sólo clientes). Repetir el mismo devuelve el ya creado (200). */
export const createClaimFromConversation = async (
  conversationId: string,
  body: CreateClaimFromConversationBody,
): Promise<ClaimFromConversation> => {
  const { data } = await http.post<ClaimFromConversation>(`/conversations/${id(conversationId)}/claim`, body, V2);
  return data;
};

// ── Configuración ─────────────────────────────────────────────────────────────

export const getChatSettings = async (): Promise<ChatSettings> => {
  const { data } = await http.get<ChatSettings>('/chat/settings', V2);
  return data;
};

export const updateChatSettings = async (body: UpdateChatSettingsBody): Promise<ChatSettings> => {
  const { data } = await http.put<ChatSettings>('/chat/settings', body, V2);
  return data;
};

export const getBusinessHours = async (): Promise<ChatBusinessHours> => {
  const { data } = await http.get<ChatBusinessHours>('/chat/business-hours', V2);
  return data;
};

export const updateBusinessHours = async (body: UpdateChatBusinessHoursBody): Promise<ChatBusinessHours> => {
  const { data } = await http.put<ChatBusinessHours>('/chat/business-hours', body, V2);
  return data;
};

/** GET /v2/chat/templates: con `channel`, las de ese canal y las de los dos. */
export const listCompanyTemplates = async (
  params: { channel?: InboxChannel; active?: boolean } = {},
): Promise<CompanyTemplateList> => {
  const { data } = await http.get<CompanyTemplateList>('/chat/templates', { ...V2, params });
  return data;
};

export const createCompanyTemplate = async (body: CreateCompanyTemplateBody): Promise<CompanyTemplate> => {
  const { data } = await http.post<CompanyTemplate>('/chat/templates', body, V2);
  return data;
};

export const updateCompanyTemplate = async (
  templateId: string,
  body: UpdateCompanyTemplateBody,
): Promise<CompanyTemplate> => {
  const { data } = await http.patch<CompanyTemplate>(`/chat/templates/${id(templateId)}`, body, V2);
  return data;
};

/** DELETE: baja lógica de la respuesta guardada (deja de ofrecerse; la clave se puede volver a usar). */
export const deleteCompanyTemplate = async (templateId: string): Promise<void> => {
  await http.delete(`/chat/templates/${id(templateId)}`, V2);
};
