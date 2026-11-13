import { env } from '../../config/env';
import { resolveFileSource, type FileSource } from './fileSource';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type { operations } from './schema';
import type {
  Attachment,
  CarDocumentScan,
  CarDocumentScanData,
  DownloadLink,
  UploadedCarDocument,
  UploadedPatentPhoto,
} from './types';

/** El tipo de documento que se declara al subirlo. */
export type CarDocumentType =
  operations['CarDocumentsV2Controller_uploadDocument']['requestBody']['content']['multipart/form-data']['documentType'];

/** El adjunto de un documento del vehículo (dueño `car_document`). */
export type CarDocumentAttachment = Attachment;

export type { CarDocumentScan, CarDocumentScanData, UploadedCarDocument, UploadedPatentPhoto };

const v2 = { baseURL: env.apiUrlV2 };
const base = (carId: string) => `/cars/${carId}/documents`;
const multipart = (key: string) => ({
  ...v2,
  headers: { 'Content-Type': 'multipart/form-data', ...idempotencyHeaders(key) },
});

/** GET /v2/cars/:carId/documents: los documentos y fotos de patente subidos al vehículo. */
export const listCarDocuments = async (carId: string): Promise<CarDocumentAttachment[]> => {
  const { data } = await http.get<CarDocumentAttachment[]>(base(carId), v2);
  return data;
};

/** POST /v2/cars/:carId/documents (multipart `file` + `documentType`): sube el documento y lo escanea en el mismo pedido. */
export const uploadCarDocument = async (
  carId: string,
  documentType: CarDocumentType,
  file: File,
  key: string,
): Promise<UploadedCarDocument> => {
  const form = new FormData();
  form.append('file', file);
  form.append('documentType', documentType);
  const { data } = await http.post<UploadedCarDocument>(base(carId), form, multipart(key));
  return data;
};

/** POST /v2/cars/:carId/documents/patent-photo (multipart `file`): sube la foto y compara la patente leída. */
export const uploadPatentPhoto = async (carId: string, file: File, key: string): Promise<UploadedPatentPhoto> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post<UploadedPatentPhoto>(`${base(carId)}/patent-photo`, form, multipart(key));
  return data;
};

/** GET /v2/cars/:carId/documents/:attachmentId/download?modo=url: la URL firmada vigente. */
export const getCarDocumentLink = async (carId: string, attachmentId: string): Promise<DownloadLink> => {
  const { data } = await http.get<DownloadLink>(`${base(carId)}/${attachmentId}/download`, {
    ...v2,
    params: { modo: 'url' },
  });
  return data;
};

/** La URL firmada del documento, lista para guardar. Nunca se guarda: se pide cada vez. */
export const getCarDocumentFile = async (carId: string, attachmentId: string): Promise<FileSource> => {
  const source = await resolveFileSource(
    () => getCarDocumentLink(carId, attachmentId),
    () => Promise.reject(new Error('El documento sólo se descarga por URL firmada')),
  );
  if (!source) throw new Error('El documento no tiene archivo');
  return source;
};

/** DELETE /v2/cars/:carId/documents/:attachmentId: baja lógica del documento. */
export const deleteCarDocument = async (carId: string, attachmentId: string): Promise<void> => {
  await http.delete(`${base(carId)}/${attachmentId}`, v2);
};
