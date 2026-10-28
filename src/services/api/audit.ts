import { http, type Page } from './httpClient';
import type { AsientoDeAuditoria, AuditActionType, AuditEntriesPage, AuditEntry, RegistroDeAuditoria } from './types';

export interface AuditFilters {
  actorUserId?: string;
  resource?: string;
  resourceId?: string;
  result?: 'success' | 'failure';
  /** YYYY-MM-DD */
  desde?: string;
  /** YYYY-MM-DD */
  hasta?: string;
}

export interface AuditParams extends AuditFilters {
  limit: number;
  offset: number;
}

/** Los filtros de GET /audit sin vacíos ni paginación: la API no distingue "" de "no filtrar por esto". Es lo que usa el exporte completo. */
export const auditQuery = (filters: AuditFilters): Record<string, string> =>
  Object.fromEntries(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));

/** Los filtros no vacíos más la paginación. */
export const buildAuditQuery = ({ limit, offset, ...filters }: AuditParams): Record<string, string | number> => ({
  ...auditQuery(filters),
  limit,
  offset,
});

/** GET /audit. Sólo admin y super_admin (un admin de empresa ve sólo su distribuidora). */
export const listAudit = async (params: AuditParams): Promise<Page<AsientoDeAuditoria>> => {
  const { data } = await http.get<RegistroDeAuditoria>('/audit', { params: buildAuditQuery(params) });
  return { rows: data.items, total: data.total };
};

export interface AuditEntriesParams {
  entity?: string;
  recordId?: string;
  userId?: string;
  actionType?: number;
  /** ISO 8601 */
  from?: string;
  /** ISO 8601 */
  to?: string;
  /** Desde 1. */
  page: number;
  limit: number;
}

/** Los filtros de GET /audit/entries sin vacíos ni paginación. Es lo que usa el exporte completo. */
export const auditEntriesQuery = (params: AuditEntriesParams): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string | number] =>
        entry[0] !== 'page' && entry[0] !== 'limit' && entry[1] !== '' && entry[1] != null,
    ),
  );

/** Los filtros no vacíos más la paginación. */
export const buildAuditEntriesQuery = (params: AuditEntriesParams): Record<string, string | number> => ({
  ...auditEntriesQuery(params),
  page: params.page,
  limit: params.limit,
});

/** GET /audit/entries: cada alta, cambio, baja o reactivación de un registro, con sus campos. */
export const listAuditEntries = async (params: AuditEntriesParams): Promise<Page<AuditEntry>> => {
  const { data } = await http.get<AuditEntriesPage>('/audit/entries', { params: buildAuditEntriesQuery(params) });
  return { rows: data.data, total: data.total };
};

/** GET /audit/entries/:id */
export const getAuditEntry = async (id: string): Promise<AuditEntry> => {
  const { data } = await http.get<AuditEntry>(`/audit/entries/${id}`);
  return data;
};

/** GET /audit/action-types: el catálogo de acciones (alta, modificación, baja lógica…). */
export const listAuditActionTypes = async (): Promise<AuditActionType[]> => {
  const { data } = await http.get<AuditActionType[]>('/audit/action-types');
  return data;
};
