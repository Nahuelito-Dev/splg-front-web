import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState } from '../../../common/components/ui';
import type { ProcessRun } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { PROCESS_RUN_STATUS, PROCESS_RUN_TRIGGER, labelOf } from '../../../utils/statusLabels';
import { counterEntries, formatDuration } from '../processMonitorRules';

interface Props {
  rows: ProcessRun[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
}

export const ProcessRunsTable = ({ rows, total, loading, pagination, onPaginationChange }: Props) => {
  const columns = useMemo<GridColDef<ProcessRun>[]>(
    () => [
      {
        field: 'process',
        headerName: 'Proceso',
        flex: 1.6,
        minWidth: 240,
        valueGetter: ({ row }) => row.title,
        renderCell: ({ row }) => (
          <div className="min-w-0 leading-tight">
            <span className="block truncate font-semibold text-ink">{row.title}</span>
            {row.error ? (
              <span className="block truncate text-[11.5px] text-danger" title={row.error}>
                {row.error}
              </span>
            ) : (
              <span className="block truncate text-[11.5px] text-muted">
                {counterEntries(row.counters)
                  .map((c) => `${c.label}: ${c.value}`)
                  .join(' · ') || 'Sin contadores'}
              </span>
            )}
          </div>
        ),
      },
      { field: 'startedAt', headerName: 'Inicio', width: 180, valueGetter: ({ row }) => formatDateTime(row.startedAt) },
      {
        field: 'durationMs',
        headerName: 'Duración',
        width: 120,
        valueGetter: ({ row }) => formatDuration(row.durationMs),
      },
      {
        field: 'trigger',
        headerName: 'Disparo',
        width: 120,
        valueGetter: ({ row }) => PROCESS_RUN_TRIGGER[row.trigger],
      },
      {
        field: 'status',
        headerName: 'Resultado',
        width: 140,
        renderCell: ({ row }) => <Badge label={labelOf(PROCESS_RUN_STATUS, row.status)} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      empty={<EmptyState title="Sin corridas" description="No hay corridas registradas con esos filtros." />}
    />
  );
};
