import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClaim,
  getClaimPhotoFile,
  listClaims,
  reopenClaim,
  resolveClaim,
  takeClaim,
  uploadClaimPhoto,
} from '../api/claims';
import type { FileSource } from '../api/fileSource';
import type { CreateClaimBody, ReopenClaimBody, ResolveClaimBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.claims;

export const useClaims = ({ refetchInterval }: { refetchInterval?: number } = {}) =>
  useQuery({ queryKey: keys.all, queryFn: listClaims, refetchInterval });

export const useCreateClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClaimBody) => createClaim(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useResolveClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResolveClaimBody }) => resolveClaim(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** PENDING → IN_PROCESS: un admin toma el reclamo para revisarlo. */
export const useTakeClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => takeClaim(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** RESOLVED/REJECTED → IN_PROCESS, con motivo. */
export const useReopenClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReopenClaimBody }) => reopenClaim(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

const photoKey = (claimId: string) => [...keys.detail(claimId), 'photo'] as const;

const TWO_MINUTES = 2 * 60_000;

/** Cuánto sirve una foto ya pedida: la mitad de lo que le queda a la URL firmada (mínimo 30 s), o 2 minutos. */
const photoStaleTime = (source: FileSource | null | undefined): number => {
  if (source?.kind !== 'url' || !source.expiresAt) return TWO_MINUTES;
  return Math.max(30_000, (new Date(source.expiresAt).getTime() - Date.now()) / 2);
};

/**
 * La foto del reclamo, pedida al abrirlo: la URL firmada vence, así que no se guarda de más (la mitad de su vida) y
 * un foco de ventana no vuelve a firmar. Resuelve `null` si el reclamo no tiene foto (`url: null`); cualquier error,
 * 404 incluido, es un error de carga.
 */
export const useClaimPhoto = (claimId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: photoKey(claimId ?? ''),
    queryFn: () => getClaimPhotoFile(claimId ?? ''),
    enabled: Boolean(claimId) && enabled,
    staleTime: (query) => photoStaleTime(query.state.data),
    gcTime: 0,
    retry: false,
  });

/** Sube o reemplaza la foto del reclamo y refresca la lista y la foto que se está viendo. */
export const useUploadClaimPhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadClaimPhoto(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
