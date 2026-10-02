import type { GridPaginationModel } from '@mui/x-data-grid';
import { useState } from 'react';
import { Card, EmptyState, FilterChips, PageHeader } from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import { useAudit } from '../../services/queries/audit';
import type { AsientoDeAuditoria } from '../../services/api/types';
import { AuditDetailModal } from './components/AuditDetailModal';
import { AuditFilters } from './components/AuditFilters';
import { auditFilterChips, EMPTY_AUDIT_FILTERS, type AuditFiltersState } from './components/auditFiltersState';
import { AuditTable } from './components/AuditTable';

/** CU-152: quién hizo cada operación que modificó datos, sobre qué y con qué resultado. */
export const Audit = () => {
  const { canViewAudit } = usePermissions();
  const [filters, setFilters] = useState<AuditFiltersState>(EMPTY_AUDIT_FILTERS);
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [detail, setDetail] = useState<AsientoDeAuditoria | null>(null);
  const debouncedFilters = useDebounce(filters, 500);

  const { data, isFetching } = useAudit({
    ...debouncedFilters,
    result: debouncedFilters.result || undefined,
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });

  if (!canViewAudit) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <PageHeader title="Auditoría" />
        <EmptyState title="Sin acceso" description="Sólo un administrador puede ver el registro de auditoría." />
      </div>
    );
  }

  const handleFiltersChange = (value: AuditFiltersState) => {
    setFilters(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Auditoría"
        description="Quién hizo cada operación, sobre qué recurso, cuándo y con qué resultado."
      />

      <AuditFilters value={filters} onChange={handleFiltersChange} />

      <FilterChips
        items={auditFilterChips(filters)}
        onRemove={(key) =>
          handleFiltersChange({ ...filters, [key]: EMPTY_AUDIT_FILTERS[key as keyof AuditFiltersState] })
        }
        onClearAll={() => handleFiltersChange(EMPTY_AUDIT_FILTERS)}
      />

      <Card>
        <AuditTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          loading={isFetching}
          pagination={pagination}
          onPaginationChange={setPagination}
          onViewDetail={setDetail}
        />
      </Card>

      <AuditDetailModal entry={detail} onClose={() => setDetail(null)} />
    </div>
  );
};
