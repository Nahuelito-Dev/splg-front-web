import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { AuditEntry } from '../../../services/api/types';
import { auditActionLabel, auditEntityLabel } from '../../../utils/auditLabels';
import { formatDateTime, formatShortId } from '../../../utils/format';

interface Props {
  rows: AuditEntry[];
  total: number;
  loading: boolean;
  filtered: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  onView: (entry: AuditEntry) => void;
}

export const DataAuditTable = ({ rows, total, loading, filtered, pagination, onPaginationChange, onView }: Props) => {
  const columns = useMemo<GridColDef<AuditEntry>[]>(
    () => [
      {
        field: 'entity',
        headerName: 'Registro',
        flex: 1.3,
        minWidth: 220,
        valueGetter: ({ row }) => auditEntityLabel(row.entity),
        renderCell: ({ row }) => (
          <IdentityCell title={auditEntityLabel(row.entity)} subtitle={formatShortId(row.recordId)} monoSubtitle />
        ),
      },
      {
        field: 'action',
        headerName: 'Acción',
        width: 150,
        valueGetter: ({ row }) => row.actionType.name,
        renderCell: ({ row }) => <Badge label={auditActionLabel(row.actionType)} />,
      },
      {
        field: 'fields',
        headerName: 'Campos',
        flex: 1,
        minWidth: 180,
        sortable: false,
        valueGetter: ({ row }) => row.details.map((d) => d.field).join(', '),
        renderCell: ({ row }) => (
          <span className="truncate font-mono text-[12px] text-muted">
            {row.details.map((d) => d.field).join(', ') || '—'}
          </span>
        ),
      },
      {
        field: 'user',
        headerName: 'Autor',
        flex: 1,
        minWidth: 180,
        valueGetter: ({ row }) => row.user?.fullName ?? 'Sistema',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.user?.fullName ?? row.user?.email ?? 'Sistema'}
            subtitle={
              row.user ? (row.user.deleted ? 'Usuario dado de baja' : (row.user.email ?? undefined)) : undefined
            }
          />
        ),
      },
      { field: 'dateTime', headerName: 'Fecha', width: 170, valueGetter: ({ row }) => formatDateTime(row.dateTime) },
      {
        field: 'actions',
        headerName: '',
        width: 64,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={`cambio de ${auditEntityLabel(row.entity)} ${formatShortId(row.recordId)}`}
            onView={() => onView(row)}
          />
        ),
      },
    ],
    [onView],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.auditId}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={onView}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún cambio coincide con los filtros."
          />
        ) : (
          <EmptyState title="Sin cambios registrados" description="Todavía no hay altas, cambios ni bajas auditadas." />
        )
      }
    />
  );
};
