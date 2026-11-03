import type { GridPaginationModel } from '@mui/x-data-grid';
import { useState } from 'react';
import { Card, DateRangeFilter, ErrorState, Select, TableToolbar } from '../../../common/components/ui';
import { useProcessRuns } from '../../../services/queries/processRuns';
import type { ProcessRun, ProcessSummaryItem } from '../../../services/api/types';
import { PROCESS_RUN_STATUS } from '../../../utils/statusLabels';
import { EMPTY_PROCESS_RUN_FILTERS, processRunChips, type ProcessRunFiltersState } from './processRunFilters';
import { ProcessRunsTable } from './ProcessRunsTable';

interface Props {
  /** Los procesos conocidos (del tablero), para el filtro y los chips. */
  processes: Pick<ProcessSummaryItem, 'process' | 'title'>[];
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  ...(Object.keys(PROCESS_RUN_STATUS) as ProcessRun['status'][]).map((value) => ({
    value,
    label: PROCESS_RUN_STATUS[value].text,
  })),
];

/** El historial de corridas con filtros por proceso, resultado y fechas (paginado contra la API). */
export const ProcessRunsHistory = ({ processes }: Props) => {
  const [filters, setFilters] = useState<ProcessRunFiltersState>(EMPTY_PROCESS_RUN_FILTERS);
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const { data, isFetching, error, refetch } = useProcessRuns({
    process: filters.process || undefined,
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });

  const change = (value: ProcessRunFiltersState) => {
    setFilters(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };
  const titleOf = (process: ProcessRun['process']) => processes.find((p) => p.process === process)?.title ?? process;
  const processOptions = [
    { value: '', label: 'Todos' },
    ...[...new Map(processes.map((p) => [p.process, p.title])).entries()].map(([value, label]) => ({ value, label })),
  ];

  return (
    <Card>
      <TableToolbar
        filters={
          <>
            <Select
              label="Proceso"
              value={filters.process}
              onChange={(e) => change({ ...filters, process: e.target.value as ProcessRunFiltersState['process'] })}
              options={processOptions}
            />
            <Select
              label="Resultado"
              value={filters.status}
              onChange={(e) => change({ ...filters, status: e.target.value as ProcessRunFiltersState['status'] })}
              options={STATUS_OPTIONS}
            />
            <DateRangeFilter
              from={filters.from}
              to={filters.to}
              onChange={(range) => change({ ...filters, from: range.from, to: range.to })}
            />
          </>
        }
        chips={processRunChips(filters, titleOf)}
        onRemoveChip={(key) =>
          change({ ...filters, [key]: EMPTY_PROCESS_RUN_FILTERS[key as keyof ProcessRunFiltersState] })
        }
        onClearChips={() => change(EMPTY_PROCESS_RUN_FILTERS)}
        resultCount={data?.total}
        noun={['corrida', 'corridas']}
      />
      {error ? (
        <ErrorState error={error} resource="El historial de corridas" onRetry={() => void refetch()} />
      ) : (
        <ProcessRunsTable
          rows={data?.items ?? []}
          total={data?.total ?? 0}
          loading={isFetching}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      )}
    </Card>
  );
};
