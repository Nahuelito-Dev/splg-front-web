import { http, type Page } from './httpClient';
import type { AsientoDeAuditoria, RegistroDeAuditoria } from './types';

interface AuditFilters {
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

/** Saca los filtros vacíos: la API no distingue "" de "no filtrar por esto". */
export const buildAuditQuery = ({ limit, offset, ...filters }: AuditParams): Record<string, string | number> => ({
  ...Object.fromEntries(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))),
  limit,
  offset,
});

/** GET /audit. Sólo admin y super_admin (un admin de empresa ve sólo su distribuidora). */
export const listAudit = async (params: AuditParams): Promise<Page<AsientoDeAuditoria>> => {
  const { data } = await http.get<RegistroDeAuditoria>('/audit', { params: buildAuditQuery(params) });
  return { rows: data.items, total: data.total };
};
