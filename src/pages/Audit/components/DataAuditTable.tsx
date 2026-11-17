import type { GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import {
  Badge,
  DataTable,
  EmptyState,
  IdentityCell,
  RowActions,
  type TableColumn,
} from '../../../common/components/ui';
import type { AuditEntryV2 } from '../../../services/api/types';
import { auditActionLabel, auditAuthorName, auditEntityLabel, auditOriginLabel } from '../../../utils/auditLabels';
import { formatDateTime, formatShortId } from '../../../utils/format';

/** El id corto del registro; en una sesión el registro es el email y se muestra entero. */
const recordLabel = (row: AuditEntryV2): string =>
  row.entity === 'Sesion' ? row.recordId : formatShortId(row.recordId);

interface Props {
  rows: AuditEntryV2[];
  total: number;
  loading: boolean;
  filtered: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  onView: (entry: AuditEntryV2) => void;
}

export const DataAuditTable = ({ rows, total, loading, filtered, pagination, onPaginationChange, onView }: Props) => {
  const columns = useMemo<TableColumn<AuditEntryV2>[]>(
    () => [
      {
        field: 'entity',
        headerName: 'Registro',
        flex: 1.3,
        minWidth: 220,
        valueGetter: ({ row }) => auditEntityLabel(row.entity),
        renderCell: ({ row }) => (
          <IdentityCell title={auditEntityLabel(row.entity)} subtitle={recordLabel(row)} monoSubtitle />
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
        // En el celular la tarjeta muestra acción, autor y fecha; los campos, en el detalle.
        card: false,
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
        valueGetter: ({ row }) => auditAuthorName(row),
        renderCell: ({ row }) => (
          <div className="flex min-w-0 flex-col items-start gap-0.5 leading-tight">
            <IdentityCell
              title={auditAuthorName(row)}
              avatarName={row.user ? auditAuthorName(row) : undefined}
              person={{ userId: row.user?.userId }}
              subtitle={
                row.user ? (row.user.deleted ? 'Usuario dado de baja' : (row.user.email ?? undefined)) : undefined
              }
            />
            <Badge label={auditOriginLabel(row.origin)} />
          </div>
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
            rowLabel={`cambio de ${auditEntityLabel(row.entity)} ${recordLabel(row)}`}
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
      rowHeight={76}
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
