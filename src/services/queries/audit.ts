import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listAudit, type AuditParams } from '../api/audit';
import { queryKeys } from './queryKeys';

export const useAudit = (params: AuditParams) =>
  useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: () => listAudit(params),
    placeholderData: keepPreviousData,
  });
