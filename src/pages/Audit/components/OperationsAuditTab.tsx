import type { GridPaginationModel } from '@mui/x-data-grid';
import { useState } from 'react';
import { Card, TableToolbar } from '../../../common/components/ui';
import { useDebounce } from '../../../hooks';
import { useAudit } from '../../../services/queries/audit';
import { auditQuery } from '../../../services/api/audit';
import type { AsientoDeAuditoria } from '../../../services/api/types';
import { AuditDetailDrawer } from './AuditDetailDrawer';
import { AuditFilters } from './AuditFilters';
import { auditFilterChips, EMPTY_AUDIT_FILTERS, type AuditFiltersState } from './auditFiltersState';
import { AuditTable } from './AuditTable';

/** CU-152: quién hizo cada operación que modificó datos, sobre qué y con qué resultado (bitácora de requests). */
export const OperationsAuditTab = () => {
  const [filters, setFilters] = useState<AuditFiltersState>(EMPTY_AUDIT_FILTERS);
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [detail, setDetail] = useState<AsientoDeAuditoria | null>(null);
  const debouncedFilters = useDebounce(filters, 500);

  const listFilters = { ...debouncedFilters, result: debouncedFilters.result || undefined };
  const { data, isFetching } = useAudit({
    ...listFilters,
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });

  const handleFiltersChange = (value: AuditFiltersState) => {
    setFilters(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <TableToolbar
          filters={<AuditFilters value={filters} onChange={handleFiltersChange} />}
          serverExport={{ resource: 'auditoria', params: auditQuery(listFilters) }}
          chips={auditFilterChips(filters)}
          onRemoveChip={(key) =>
            handleFiltersChange({ ...filters, [key]: EMPTY_AUDIT_FILTERS[key as keyof AuditFiltersState] })
          }
          onClearChips={() => handleFiltersChange(EMPTY_AUDIT_FILTERS)}
          resultCount={data?.total}
          noun={['asiento', 'asientos']}
        />
        <AuditTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          loading={isFetching}
          pagination={pagination}
          onPaginationChange={setPagination}
          onViewDetail={setDetail}
        />
      </Card>

      <AuditDetailDrawer entry={detail} onClose={() => setDetail(null)} />
    </div>
  );
};
