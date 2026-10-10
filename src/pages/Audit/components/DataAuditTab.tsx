import type { GridPaginationModel } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { Card, ErrorState, FilterChips, type SelectOption } from '../../../common/components/ui';
import { useDebounce, useUrlParams } from '../../../hooks';
import type { AuditEntry } from '../../../services/api/types';
import { useAuditActionTypes, useAuditEntries } from '../../../services/queries/audit';
import { DataAuditDrawer } from './DataAuditDrawer';
import { DataAuditFiltersBar } from './DataAuditFiltersBar';
import { DataAuditTable } from './DataAuditTable';
import {
  dataAuditChips,
  EMPTY_DATA_AUDIT_FILTERS,
  toAuditEntriesParams,
  type DataAuditFilters,
} from './dataAuditFilters';

/** Auditoría de datos: cada alta, cambio, baja o reactivación de un registro, con campo anterior y nuevo. */
export const DataAuditTab = () => {
  const [{ page: pageParam, ...filters }, setFilters] = useUrlParams<keyof DataAuditFilters | 'page'>({
    ...EMPTY_DATA_AUDIT_FILTERS,
    page: '1',
  });
  const [pageSize, setPageSize] = useState(25);
  const pagination: GridPaginationModel = { page: Math.max(0, Number(pageParam) - 1 || 0), pageSize };
  const setPagination = (model: GridPaginationModel) => {
    setPageSize(model.pageSize);
    setFilters({ page: String(model.page + 1) });
  };
  const [detail, setDetail] = useState<AuditEntry | null>(null);

  const { data: actionTypes } = useAuditActionTypes();
  // Un pedido por tecla no: se espera a que deje de escribir (los filtros se comparan por su contenido).
  const filtersKey = useDebounce(JSON.stringify(filters), 500);
  const applied = useMemo(() => JSON.parse(filtersKey) as DataAuditFilters, [filtersKey]);
  const { data, isFetching, error, refetch } = useAuditEntries(
    toAuditEntriesParams(applied, pagination.page + 1, pagination.pageSize),
  );

  const actionOptions = useMemo<SelectOption[]>(
    () => (actionTypes ?? []).map((a) => ({ value: String(a.id), label: a.name })),
    [actionTypes],
  );
  const chips = dataAuditChips(filters, (id) => actionTypes?.find((a) => a.id === id)?.name);

  const change = (patch: Partial<DataAuditFilters>) => {
    setFilters({ ...patch, page: '1' });
  };

  return (
    <div className="space-y-6">
      <DataAuditFiltersBar value={filters} onChange={change} actionOptions={actionOptions} />
      <FilterChips
        items={chips}
        onRemove={(key) => change({ [key]: '' })}
        onClearAll={() => change(EMPTY_DATA_AUDIT_FILTERS)}
        resultCount={data?.total}
      />
      <Card>
        {error ? (
          <ErrorState error={error} resource="La auditoría" onRetry={() => void refetch()} />
        ) : (
          <DataAuditTable
            rows={data?.rows ?? []}
            total={data?.total ?? 0}
            loading={isFetching}
            filtered={chips.length > 0}
            pagination={pagination}
            onPaginationChange={setPagination}
            onView={setDetail}
          />
        )}
      </Card>
      <DataAuditDrawer entry={detail} onClose={() => setDetail(null)} />
    </div>
  );
};
