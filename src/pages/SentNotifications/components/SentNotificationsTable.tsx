import type { GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState, RowActions, type TableColumn } from '../../../common/components/ui';
import type { NotificationLogItem } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { NOTIFICATION_CHANNEL, NOTIFICATION_STATUS, labelOf, notificationTypeLabel } from '../../../utils/statusLabels';

interface Props {
  rows: NotificationLogItem[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Hay filtros activos: un vacío significa «sin resultados». */
  filtered: boolean;
  onView: (item: NotificationLogItem) => void;
}

/** Un renglón por aviso; el motivo del fallo, el pedido y el resto están en el detalle. */
export const SentNotificationsTable = ({
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  filtered,
  onView,
}: Props) => {
  const columns = useMemo<TableColumn<NotificationLogItem>[]>(
    () => [
      {
        field: 'type',
        headerName: 'Aviso',
        kind: 'main',
        flex: 1.3,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <div className="min-w-0 py-1">
            <p className="truncate text-sm text-ink">{notificationTypeLabel(row.type)}</p>
            {row.subject && <p className="truncate text-xs text-muted">{row.subject}</p>}
          </div>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Fecha',
        kind: 'date',
        card: true,
        sortable: false,
        renderCell: ({ row }) => formatDateTime(row.createdAt),
      },
      {
        field: 'channel',
        headerName: 'Canal',
        width: 130,
        card: true,
        sortable: false,
        renderCell: ({ row }) => <Badge label={labelOf(NOTIFICATION_CHANNEL, row.channel)} />,
      },
      {
        field: 'recipientMasked',
        headerName: 'Destinatario',
        flex: 1,
        minWidth: 160,
        card: true,
        sortable: false,
        renderCell: ({ row }) => <span className="truncate text-sm text-ink">{row.recipientMasked}</span>,
      },
      {
        field: 'status',
        headerName: 'Estado',
        kind: 'status',
        width: 120,
        sortable: false,
        renderCell: ({ row }) => <Badge label={labelOf(NOTIFICATION_STATUS, row.status)} />,
      },
      {
        field: 'actions',
        headerName: '',
        kind: 'actions',
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions rowLabel={`aviso ${notificationTypeLabel(row.type)}`} onView={() => onView(row)} />
        ),
      },
    ],
    [onView],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.notificationLogId}
      loading={loading}
      label="avisos enviados"
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={onView}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún aviso coincide con los filtros elegidos."
          />
        ) : (
          <EmptyState
            illustration="done"
            title="Todavía no se envió ningún aviso"
            description="Acá van a aparecer las notificaciones y los correos que mande el sistema."
          />
        )
      }
    />
  );
};
