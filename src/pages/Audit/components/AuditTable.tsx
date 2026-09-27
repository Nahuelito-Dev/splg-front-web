import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { AsientoDeAuditoria } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { AUDIT_RESULT, labelOf } from '../../../utils/statusLabels';

const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

interface Props {
  rows: AsientoDeAuditoria[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  onViewDetail: (entry: AsientoDeAuditoria) => void;
}

export const AuditTable = ({ rows, total, loading, pagination, onPaginationChange, onViewDetail }: Props) => {
  const columns = useMemo<GridColDef<AsientoDeAuditoria>[]>(
    () => [
      {
        field: 'operation',
        headerName: 'Operación',
        flex: 1.6,
        minWidth: 260,
        valueGetter: ({ row }) => row.resource,
        renderCell: ({ row }) => (
          <div className="min-w-0 leading-tight">
            <span className="block truncate font-semibold text-ink">{row.resource}</span>
            <span className="block truncate font-mono text-[11.5px] text-muted">
              <b className="font-semibold text-ink-2">{row.httpMethod}</b> {row.path}
            </span>
          </div>
        ),
      },
      {
        field: 'author',
        headerName: 'Autor',
        flex: 1,
        minWidth: 170,
        valueGetter: ({ row }) => row.actorRole ?? 'Sistema',
        renderCell: ({ row }) => (
          <IdentityCell title={row.actorRole ?? 'Sistema'} subtitle={shortId(row.actorUserId)} monoSubtitle />
        ),
      },
      { field: 'createdAt', headerName: 'Fecha', width: 180, valueGetter: ({ row }) => formatDateTime(row.createdAt) },
      {
        field: 'result',
        headerName: 'Resultado',
        width: 130,
        renderCell: ({ row }) => <Badge label={labelOf(AUDIT_RESULT, row.result)} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 64,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions rowLabel={`operación sobre ${row.resource}`} onView={() => onViewDetail(row)} />
        ),
      },
    ],
    [onViewDetail],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.auditId}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={onViewDetail}
      empty={<EmptyState title="Sin registros" description="No hay operaciones para los filtros elegidos." />}
    />
  );
};
