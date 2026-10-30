import { env } from '../../config/env';
import { toIsoDay } from '../../utils/dates';
import { toApiErrorFromBlob } from './errors';
import { http } from './httpClient';

export type ExportFormat = 'csv' | 'xlsx';

/** Recursos que exporta `GET /v2/exports/:recurso` (ver la descripción del endpoint en el back). */
export type ExportResource =
  | 'pedidos'
  | 'clientes'
  | 'choferes'
  | 'vehiculos'
  | 'garrafas'
  | 'envases'
  | 'stock-resumen'
  | 'stock-movimientos'
  | 'cajas'
  | 'movimientos-caja'
  | 'income-statement'
  | 'cuentas-corrientes'
  | 'rendiciones'
  | 'liquidaciones'
  | 'combustible'
  | 'multas'
  | 'siniestros'
  | 'neumaticos'
  | 'costos-flota'
  | 'reclamos'
  | 'incidencias'
  | 'ordenes-compra'
  | 'recepciones'
  | 'proveedores'
  | 'legajos'
  | 'auditoria'
  | 'auditoria-datos';

/** Los filtros del listado tal como los manda su `list…`: la paginación el back la ignora. */
export type ExportParams = Record<string, string | number | boolean | string[] | null | undefined>;

export interface ExportedFile {
  blob: Blob;
  filename: string;
  /** Filas exportadas (`X-Total-Count`). */
  total: number;
}

/**
 * GET /v2/exports/:recurso: todas las filas que cumplen los filtros, no sólo la página visible.
 * El nombre del archivo se arma igual que en el back (`<recurso>-<AAAA-MM-DD>.<ext>`): el
 * `Content-Disposition` no está entre los encabezados que expone el CORS.
 */
export const downloadExport = async (
  resource: ExportResource,
  format: ExportFormat,
  params: ExportParams = {},
): Promise<ExportedFile> => {
  try {
    const response = await http.get<Blob>(`/exports/${resource}`, {
      baseURL: env.apiUrlV2,
      params: { ...params, format },
      responseType: 'blob',
    });
    const total = Number(response.headers['x-total-count'] ?? Number.NaN);
    return {
      blob: response.data,
      filename: `${resource}-${toIsoDay(new Date())}.${format}`,
      total: Number.isFinite(total) ? total : 0,
    };
  } catch (error) {
    throw await toApiErrorFromBlob(error);
  }
};
