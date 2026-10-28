import { env } from '../../config/env';
import { toApiErrorFromBlob } from './errors';
import { http } from './httpClient';
import type { ImportConfirm, ImportPreview } from './types';

export type ImportResource = ImportPreview['recurso'];
export type ImportFormat = 'csv' | 'xlsx';

export interface ImportTemplate {
  blob: Blob;
  filename: string;
}

/** GET /v2/imports/:recurso/template: encabezado y una fila de ejemplo. El nombre lo arma el panel (el CORS no expone `Content-Disposition`). */
export const downloadImportTemplate = async (
  resource: ImportResource,
  format: ImportFormat,
): Promise<ImportTemplate> => {
  try {
    const response = await http.get<Blob>(`/imports/${resource}/template`, {
      baseURL: env.apiUrlV2,
      params: { format },
      responseType: 'blob',
    });
    return { blob: response.data, filename: `plantilla-${resource}.${format}` };
  } catch (error) {
    throw await toApiErrorFromBlob(error);
  }
};

/** POST /v2/imports/:recurso/preview: valida todas las filas y deja la importación pendiente (no aplica nada). */
export const previewImport = async (resource: ImportResource, file: File): Promise<ImportPreview> => {
  const body = new FormData();
  body.append('file', file);
  const { data } = await http.post<ImportPreview>(`/imports/${resource}/preview`, body, {
    baseURL: env.apiUrlV2,
    // Sin el JSON por defecto: el navegador pone `multipart/form-data` con su boundary.
    headers: { 'Content-Type': undefined },
  });
  return data;
};

/** POST /v2/imports/:importId/confirm: aplica la importación. Repetirla devuelve `yaConfirmada: true`. */
export const confirmImport = async (importId: string): Promise<ImportConfirm> => {
  const { data } = await http.post<ImportConfirm>(`/imports/${importId}/confirm`, undefined, {
    baseURL: env.apiUrlV2,
  });
  return data;
};
