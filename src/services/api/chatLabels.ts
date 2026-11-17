import { env } from '../../config/env';
import { http } from './httpClient';
import type { ChatLabel, ChatLabelList, CreateChatLabelBody, InboxConversation, UpdateChatLabelBody } from './types';

/**
 * Las etiquetas de la bandeja (7c): el catálogo de la empresa (`mensajes.configurar` para cambiarlo; lo lee cualquiera
 * que atienda, configure o supervise los mensajes) y las que tiene cada conversación (los permisos de su canal).
 */
const V2 = { baseURL: env.apiUrlV2 } as const;

export type ChatLabelColor = ChatLabel['color'];

/** Las claves de la paleta, en el orden en que se ofrecen (`ChatLabelColor`, lo valida la API). */
export const CHAT_LABEL_COLORS = [
  'gray',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'indigo',
  'purple',
  'pink',
] as const satisfies readonly ChatLabelColor[];

/** Nombre de 1 a 30 caracteres (contados como letras) en una sola línea. */
export const CHAT_LABEL_NAME_MAX = 30;
/** Etiquetas vigentes por empresa y por conversación. */
export const CHAT_LABELS_MAX = 50;
export const CONVERSATION_LABELS_MAX = 5;

/** Códigos de los 409 del ABM. */
export const CHAT_LABEL_NAME_TAKEN = 'CHAT_LABEL_NAME_TAKEN';
export const CHAT_LABEL_LIMIT_REACHED = 'CHAT_LABEL_LIMIT_REACHED';

const id = (value: string) => encodeURIComponent(value);

/** GET /v2/chat/labels: las vigentes de la empresa, por nombre. */
export const listChatLabels = async (): Promise<ChatLabelList> => {
  const { data } = await http.get<ChatLabelList>('/chat/labels', V2);
  return data;
};

export const createChatLabel = async (body: CreateChatLabelBody): Promise<ChatLabel> => {
  const { data } = await http.post<ChatLabel>('/chat/labels', body, V2);
  return data;
};

export const updateChatLabel = async (labelId: string, body: UpdateChatLabelBody): Promise<ChatLabel> => {
  const { data } = await http.patch<ChatLabel>(`/chat/labels/${id(labelId)}`, body, V2);
  return data;
};

/** DELETE: baja lógica; sale de todas las conversaciones que la tenían y el nombre queda libre. */
export const deleteChatLabel = async (labelId: string): Promise<void> => {
  await http.delete(`/chat/labels/${id(labelId)}`, V2);
};

/** PUT /v2/conversations/:id/labels: deja exactamente esas (0 a 5); devuelve la conversación con sus etiquetas. */
export const setConversationLabels = async (conversationId: string, labelIds: string[]): Promise<InboxConversation> => {
  const { data } = await http.put<InboxConversation>(`/conversations/${id(conversationId)}/labels`, { labelIds }, V2);
  return data;
};
