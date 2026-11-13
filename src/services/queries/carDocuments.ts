import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteCarDocument,
  getCarDocumentFile,
  listCarDocuments,
  uploadCarDocument,
  uploadPatentPhoto,
  type CarDocumentType,
} from '../api/carDocuments';
import { newIdempotencyKey } from '../api/idempotency';
import { queryKeys } from './queryKeys';

const keys = queryKeys.carDocuments;
const listKey = (carId: string) => keys.list({ carId });

/** Los documentos escaneados del vehículo (API v2). */
export const useScannedCarDocuments = (carId: string, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: listKey(carId), queryFn: () => listCarDocuments(carId), enabled });

export const useUploadCarDocument = (carId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentType, file }: { documentType: CarDocumentType; file: File }) =>
      uploadCarDocument(carId, documentType, file, newIdempotencyKey()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey(carId) }),
  });
};

export const useUploadPatentPhoto = (carId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadPatentPhoto(carId, file, newIdempotencyKey()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey(carId) }),
  });
};

export const useDeleteCarDocument = (carId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => deleteCarDocument(carId, attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey(carId) }),
  });
};

/** No cachea nada: la URL firmada vence, así que se pide cada vez que se baja. */
export const useCarDocumentFile = (carId: string) =>
  useMutation({ mutationFn: (attachmentId: string) => getCarDocumentFile(carId, attachmentId) });
