import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type { ListParams } from './stock';
import type {
  ConfirmDocumentReadingBody,
  CorrectDocumentReadingBody,
  DocumentReading,
  DocumentReadingList,
  DocumentReadingRun,
  DocumentReadingSpend,
  RejectDocumentReadingBody,
  RunDocumentReadingsBody,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };
const BASE = '/document-readings';

export interface DocumentReadingFilters {
  status?: DocumentReading['status'];
  /** Tipo detectado por el lector. */
  type?: NonNullable<DocumentReading['detectedType']>;
}

/** GET /v2/document-readings: las lecturas de la distribuidora, la más nueva primero. */
export const listDocumentReadings = async (
  { page, pageSize }: ListParams,
  filters: DocumentReadingFilters = {},
): Promise<DocumentReadingList> => {
  const { data } = await http.get<DocumentReadingList>(BASE, {
    ...v2,
    params: { ...filters, limit: pageSize, offset: page * pageSize },
  });
  return data;
};

/** GET /v2/document-readings/spend: lecturas con consumo del mes (hora argentina) y su costo en dólares. */
export const getDocumentReadingSpend = async (): Promise<DocumentReadingSpend> => {
  const { data } = await http.get<DocumentReadingSpend>(`${BASE}/spend`, v2);
  return data;
};

/** GET /v2/document-readings/:id: una lectura con su adjunto y la propuesta. */
export const getDocumentReading = async (id: string): Promise<DocumentReading> => {
  const { data } = await http.get<DocumentReading>(`${BASE}/${id}`, v2);
  return data;
};

/** POST /v2/document-readings/run: lee los pendientes ahora; con `dryRun` sólo cuenta cuántos leería. */
export const runDocumentReadings = async (body: RunDocumentReadingsBody): Promise<DocumentReadingRun> => {
  const { data } = await http.post<DocumentReadingRun>(`${BASE}/run`, body, v2);
  return data;
};

/** POST /v2/document-readings/:id/confirm: los datos leídos están bien; si la propuesta paga, registra el pago. */
export const confirmDocumentReading = async (
  id: string,
  body: ConfirmDocumentReadingBody,
  key: string,
): Promise<DocumentReading> => {
  const { data } = await http.post<DocumentReading>(`${BASE}/${id}/confirm`, body, {
    ...v2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** POST /v2/document-readings/:id/correct: confirma con los datos corregidos. */
export const correctDocumentReading = async (
  id: string,
  body: CorrectDocumentReadingBody,
  key: string,
): Promise<DocumentReading> => {
  const { data } = await http.post<DocumentReading>(`${BASE}/${id}/correct`, body, {
    ...v2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** POST /v2/document-readings/:id/reject: cierra la propuesta con un motivo, sin ejecutar nada. */
export const rejectDocumentReading = async (
  id: string,
  body: RejectDocumentReadingBody,
  key: string,
): Promise<DocumentReading> => {
  const { data } = await http.post<DocumentReading>(`${BASE}/${id}/reject`, body, {
    ...v2,
    headers: idempotencyHeaders(key),
  });
  return data;
};
