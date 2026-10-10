import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getAuditEntry,
  listAudit,
  listAuditActionTypes,
  listAuditEntries,
  type AuditEntriesParams,
  type AuditParams,
} from '../api/audit';
import { queryKeys } from './queryKeys';

export const useAudit = (params: AuditParams) =>
  useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: () => listAudit(params),
    placeholderData: keepPreviousData,
  });

export const useAuditEntries = (params: AuditEntriesParams) =>
  useQuery({
    queryKey: queryKeys.audit.list({ kind: 'entries', ...params }),
    queryFn: () => listAuditEntries(params),
    placeholderData: keepPreviousData,
  });

export const useAuditEntry = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.audit.detail(id ?? ''),
    queryFn: () => getAuditEntry(id as string),
    enabled: Boolean(id),
  });

/** El catálogo no cambia: se pide una vez. */
export const useAuditActionTypes = () =>
  useQuery({
    queryKey: queryKeys.audit.list({ kind: 'action-types' }),
    queryFn: listAuditActionTypes,
    staleTime: Infinity,
  });
