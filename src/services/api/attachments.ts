import { resolveFileSource, type FileSource } from './fileSource';
import { http } from './httpClient';
import type { Attachment, AttachmentOwnerType, DownloadLink } from './types';

/** GET /attachments/:ownerType/:ownerId */
export const listAttachments = async (ownerType: AttachmentOwnerType, ownerId: string): Promise<Attachment[]> => {
  const { data } = await http.get<Attachment[]>(`/attachments/${ownerType}/${ownerId}`);
  return data;
};

/**
 * POST /attachments/:ownerType/:ownerId (multipart: `file` y `label` opcional). El back valida el tipo por el
 * contenido y el tamaño; se fuerza el content-type para que axios no mande el FormData como JSON.
 */
export const uploadAttachment = async (
  ownerType: AttachmentOwnerType,
  ownerId: string,
  file: File,
  label?: string,
): Promise<Attachment> => {
  const form = new FormData();
  form.append('file', file);
  if (label?.trim()) form.append('label', label.trim());
  const { data } = await http.post<Attachment>(`/attachments/${ownerType}/${ownerId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

type AttachmentDisposition = 'attachment' | 'inline';

/** GET /attachments/:id/download?modo=url: la URL firmada vigente (vence en minutos). */
export const getAttachmentLink = async (
  attachmentId: string,
  disposition: AttachmentDisposition = 'attachment',
): Promise<DownloadLink> => {
  const { data } = await http.get<DownloadLink>(`/attachments/${attachmentId}/download`, {
    params: { modo: 'url', disposicion: disposition },
  });
  return data;
};

/** La URL firmada del adjunto, lista para abrir o guardar. Nunca se guarda: se pide cada vez. */
export const getAttachmentFile = async (
  attachmentId: string,
  disposition: AttachmentDisposition = 'attachment',
): Promise<FileSource> => {
  const source = await resolveFileSource(
    () => getAttachmentLink(attachmentId, disposition),
    () => Promise.reject(new Error('El adjunto sólo se descarga por URL firmada')),
  );
  if (!source) throw new Error('El adjunto no tiene archivo');
  return source;
};

/** DELETE /attachments/:id */
export const deleteAttachment = async (attachmentId: string): Promise<void> => {
  await http.delete(`/attachments/${attachmentId}`);
};
