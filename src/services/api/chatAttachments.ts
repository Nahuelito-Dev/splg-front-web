import type { AxiosProgressEvent } from 'axios';
import { env } from '../../config/env';
import { withAttachmentType } from '../../utils/attachments';
import { http } from './httpClient';
import type { DownloadLink, InboxMessage, MessageDto } from './types';

/**
 * Adjuntos del chat (CH7, `splg-docs/sistema/DISENO-COMUNICACION.md` §9): subir un archivo como mensaje y pedir el
 * enlace firmado para verlo. El mensaje nunca trae la URL: se pide al verlo y vence a los 300 s (no se guarda).
 *
 * Subida (multipart): `file`, `clientMessageId` (el mismo en un reintento: la API devuelve el ya guardado con 200,
 * sin volver a subir) y `caption` opcional (≤ 500). Errores con el texto en castellano de la API: 413 (tope del
 * canal), 415 (tipo), 429 (30 por día o demasiados seguidos), 409 (conversación cerrada).
 *
 * Enlace: 409 `ATTACHMENT_SCAN_PENDING` / `ATTACHMENT_SCAN_FAILED` (todavía no se puede bajar), 404 (no existe o
 * quedó bloqueado).
 */
const V2 = { baseURL: env.apiUrlV2 } as const;

export interface ChatAttachmentInput {
  file: File;
  clientMessageId: string;
  caption?: string;
}

/** El avance de la subida, de 0 a 100. */
export type OnUploadProgress = (percent: number) => void;

const id = (value: string) => encodeURIComponent(value);

const formOf = ({ file, clientMessageId, caption }: ChatAttachmentInput): FormData => {
  const form = new FormData();
  form.append('file', withAttachmentType(file));
  form.append('clientMessageId', clientMessageId);
  const text = caption?.trim();
  if (text) form.append('caption', text);
  return form;
};

const upload = async <T>(path: string, input: ChatAttachmentInput, onProgress?: OnUploadProgress): Promise<T> => {
  const { data } = await http.post<T>(path, formOf(input), {
    ...V2,
    // Sin esto axios manda el FormData como JSON.
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: ({ loaded, total: bytes }: AxiosProgressEvent) => {
      if (onProgress && bytes) onProgress(Math.min(100, Math.round((loaded / bytes) * 100)));
    },
  });
  return data;
};

const link = async (path: string): Promise<DownloadLink> => {
  const { data } = await http.get<DownloadLink>(path, V2);
  return data;
};

// ── Bandeja de la empresa (clientes y choferes) ───────────────────────────────

/** POST /v2/conversations/:id/attachments */
export const uploadConversationAttachment = (
  conversationId: string,
  input: ChatAttachmentInput,
  onProgress?: OnUploadProgress,
) => upload<InboxMessage>(`/conversations/${id(conversationId)}/attachments`, input, onProgress);

/** GET /v2/conversations/:id/messages/:messageId/attachment */
export const getConversationAttachmentLink = (conversationId: string, messageId: string) =>
  link(`/conversations/${id(conversationId)}/messages/${id(messageId)}/attachment`);

// ── Empresa: chat con la plataforma y tickets ─────────────────────────────────

/** POST /v2/company/platform-chat/:conversationId/attachments */
export const uploadCompanyChatAttachment = (
  conversationId: string,
  input: ChatAttachmentInput,
  onProgress?: OnUploadProgress,
) => upload<MessageDto>(`/company/platform-chat/${id(conversationId)}/attachments`, input, onProgress);

/** GET /v2/company/platform-chat/:conversationId/messages/:messageId/attachment */
export const getCompanyChatAttachmentLink = (conversationId: string, messageId: string) =>
  link(`/company/platform-chat/${id(conversationId)}/messages/${id(messageId)}/attachment`);

/** POST /v2/company/tickets/:id/attachments (es una respuesta: el ticket pasa a «en curso»). */
export const uploadCompanyTicketAttachment = (
  ticketId: string,
  input: ChatAttachmentInput,
  onProgress?: OnUploadProgress,
) => upload<MessageDto>(`/company/tickets/${id(ticketId)}/attachments`, input, onProgress);

/** GET /v2/company/tickets/:id/messages/:messageId/attachment */
export const getCompanyTicketAttachmentLink = (ticketId: string, messageId: string) =>
  link(`/company/tickets/${id(ticketId)}/messages/${id(messageId)}/attachment`);

// ── Plataforma: chats y tickets con las empresas ──────────────────────────────

/** POST /v2/platform/chats/:id/attachments */
export const uploadPlatformChatAttachment = (
  conversationId: string,
  input: ChatAttachmentInput,
  onProgress?: OnUploadProgress,
) => upload<MessageDto>(`/platform/chats/${id(conversationId)}/attachments`, input, onProgress);

/** GET /v2/platform/chats/:id/messages/:messageId/attachment */
export const getPlatformChatAttachmentLink = (conversationId: string, messageId: string) =>
  link(`/platform/chats/${id(conversationId)}/messages/${id(messageId)}/attachment`);

/** POST /v2/platform/tickets/:id/attachments (deja el ticket esperando a la empresa). */
export const uploadPlatformTicketAttachment = (
  ticketId: string,
  input: ChatAttachmentInput,
  onProgress?: OnUploadProgress,
) => upload<MessageDto>(`/platform/tickets/${id(ticketId)}/attachments`, input, onProgress);

/** GET /v2/platform/tickets/:id/messages/:messageId/attachment */
export const getPlatformTicketAttachmentLink = (ticketId: string, messageId: string) =>
  link(`/platform/tickets/${id(ticketId)}/messages/${id(messageId)}/attachment`);
