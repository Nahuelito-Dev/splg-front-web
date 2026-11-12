import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAttachment, getAttachmentFile, listAttachments, uploadAttachment } from '../api/attachments';
import type { AttachmentOwnerType } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.attachments;
const listKey = (ownerType: AttachmentOwnerType, ownerId: string) => keys.list({ ownerType, ownerId });

export const useAttachments = (ownerType: AttachmentOwnerType, ownerId: string) =>
  useQuery({ queryKey: listKey(ownerType, ownerId), queryFn: () => listAttachments(ownerType, ownerId) });

export const useUploadAttachment = (ownerType: AttachmentOwnerType, ownerId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, label }: { file: File; label?: string }) => uploadAttachment(ownerType, ownerId, file, label),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey(ownerType, ownerId) }),
  });
};

export const useDeleteAttachment = (ownerType: AttachmentOwnerType, ownerId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey(ownerType, ownerId) }),
  });
};

/** No cachea nada: la URL firmada vence, así que se pide cada vez que se abre o se baja. */
export const useAttachmentFile = () =>
  useMutation({
    mutationFn: ({ attachmentId, disposition }: { attachmentId: string; disposition?: 'attachment' | 'inline' }) =>
      getAttachmentFile(attachmentId, disposition),
  });

/**
 * El archivo para mostrarlo dentro de una ficha (`inline`). La URL firmada vence en minutos: no se guarda en el caché
 * (se pide al abrir la ficha) ni se vuelve a pedir sola al volver a la pestaña.
 */
export const useAttachmentPreview = (
  attachmentId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: keys.detail(`preview:${attachmentId}`),
    queryFn: () => getAttachmentFile(attachmentId ?? '', 'inline'),
    enabled: Boolean(attachmentId) && enabled,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
