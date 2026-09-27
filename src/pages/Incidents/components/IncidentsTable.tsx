import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Incident } from '../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { INCIDENT_STATUS, INCIDENT_TYPE, labelOf } from '../../../utils/statusLabels';

interface Props {
  rows: Incident[];
  loading: boolean;
  onView: (incident: Incident) => void;
}

export const IncidentsTable = ({ rows, loading, onView }: Props) => {
  const columns = useMemo<GridColDef<Incident>[]>(
    () => [
      {
        field: 'customer',
        headerName: 'Cliente',
        flex: 1.3,
        minWidth: 200,
        valueGetter: ({ row }) => row.order?.customer?.full_name ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.order?.customer?.full_name ?? 'Cliente sin nombre'}
            subtitle={`Pedido ${formatShortId(row.order_id)}`}
            avatarName={row.order?.customer?.full_name ?? '?'}
          />
        ),
      },
      {
        field: 'type',
        headerName: 'Tipo',
        width: 160,
        renderCell: ({ row }) => <Badge label={labelOf(INCIDENT_TYPE, row.type)} />,
      },
      {
        field: 'createdAt',
        headerName: 'Fecha',
        width: 170,
        valueFormatter: ({ value }: { value: string }) => formatDateTime(value),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ row }) => <Badge label={labelOf(INCIDENT_STATUS, row.status)} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 64,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions rowLabel={`incidencia del pedido ${formatShortId(row.order_id)}`} onView={() => onView(row)} />
        ),
      },
    ],
    [onView],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.incident_id}
      loading={loading}
      onRowClick={onView}
      empty={<EmptyState title="Sin incidencias" description="Los choferes no reportaron problemas de reparto." />}
    />
  );
};
