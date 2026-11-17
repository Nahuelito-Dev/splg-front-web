import { env } from '../../config/env';
import { http } from './httpClient';
import type { ChatAgent, ChatAgentList, ChatStatus, UpdateChatAgentBody, UpdateMyChatStatusBody } from './types';

/**
 * La asignación automática de la bandeja (8b): el estado propio de quien atiende («En línea» / «Ausente»), el equipo
 * con su carga y el tope por persona. Los ajustes de la empresa (`autoAssignEnabled`, `autoAssignMaxOpen`) van por
 * `PUT /v2/chat/settings` (`services/api/inbox`).
 */
const V2 = { baseURL: env.apiUrlV2 } as const;

export type ChatAgentStatus = ChatStatus['status'];

/** Tope de conversaciones abiertas por persona (`UpdateChatSettingsDto.autoAssignMaxOpen` y `UpdateChatAgentDto`). */
export const AUTO_ASSIGN_MAX_OPEN_MIN = 1;
export const AUTO_ASSIGN_MAX_OPEN_MAX = 50;

/** GET /v2/me/chat-status: el estado de quien mira, su tope y cuántas tiene abiertas. */
export const getMyChatStatus = async (): Promise<ChatStatus> => {
  const { data } = await http.get<ChatStatus>('/me/chat-status', V2);
  return data;
};

/** PUT /v2/me/chat-status: «En línea» reparte lo que espera sin esperar el reparto (lo asignado llega por el socket). */
export const updateMyChatStatus = async (body: UpdateMyChatStatusBody): Promise<ChatStatus> => {
  const { data } = await http.put<ChatStatus>('/me/chat-status', body, V2);
  return data;
};

/** GET /v2/chat/agents: el equipo que atiende algún canal (`mensajes.supervisar` o `mensajes.configurar`). */
export const listChatAgents = async (): Promise<ChatAgentList> => {
  const { data } = await http.get<ChatAgentList>('/chat/agents', V2);
  return data;
};

/** PUT /v2/chat/agents/:userId: el tope propio de una persona (`null`: el de la empresa). Pide `mensajes.configurar`. */
export const updateChatAgent = async (userId: string, body: UpdateChatAgentBody): Promise<ChatAgent> => {
  const { data } = await http.put<ChatAgent>(`/chat/agents/${encodeURIComponent(userId)}`, body, V2);
  return data;
};
