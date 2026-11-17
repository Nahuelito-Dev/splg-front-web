import { useMutation, useQuery } from '@tanstack/react-query';
import type { DownloadLink } from '../api/types';
import { queryKeys } from './queryKeys';

/** Pide el enlace firmado de un adjunto del chat (cada hilo sabe por qué endpoint: bandeja, soporte o plataforma). */
export type ChatAttachmentLinkFn = (messageId: string) => Promise<DownloadLink>;

/**
 * El enlace de una foto del hilo para la miniatura, pedido al mostrarla. Vence a los 300 s: no se guarda en el caché
 * (al volver a montarse se pide de nuevo), no se repite solo y, si la imagen deja de cargar, quien la muestra lo
 * vuelve a pedir con `refetch`.
 */
export const useChatAttachmentLink = (link: ChatAttachmentLinkFn, messageId: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.chatAttachments.detail(messageId),
    queryFn: () => link(messageId),
    enabled,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

/** Un enlace nuevo cada vez que se abre el visor o se descarga: el de la miniatura puede estar vencido. */
export const useFreshChatAttachmentLink = (link: ChatAttachmentLinkFn) =>
  useMutation({ mutationFn: (messageId: string) => link(messageId) });
