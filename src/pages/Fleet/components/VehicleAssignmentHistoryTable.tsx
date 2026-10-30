import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card, DataTable, EmptyState, IdentityCell, CardHeader } from '../../../common/components/ui';
import type { VehicleAssignmentHistory } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { vehicleAssignmentStatus } from '../../../utils/statusLabels';

interface Props {
  rows: VehicleAssignmentHistory[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /**
   * `driver`: la ficha de un chofer, donde lo que cambia de fila a fila es el vehículo.
   * `car`: la ficha de un vehículo, donde lo que cambia es el chofer que lo usó.
   */
  variant: 'driver' | 'car';
}

/**
 * Historial de `GET /delivery/:id/vehicle-history` (variant "driver") o
 * `GET /car/:id/assignments` (variant "car"): misma forma de fila, sólo cambia qué identidad
 * se muestra primero (el back ya la trae resuelta, sin pedidos aparte).
 */
export const VehicleAssignmentHistoryTable = ({
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  variant,
}: Props) => {
  const navigate = useNavigate();

  const columns = useMemo<GridColDef<VehicleAssignmentHistory>[]>(
    () => [
      {
        field: 'identity',
        headerName: variant === 'driver' ? 'Vehículo' : 'Chofer',
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        valueGetter: ({ row }) =>
          variant === 'driver' ? [row.carBrand, row.carModel].filter(Boolean).join(' ') : (row.driverName ?? ''),
        renderCell: ({ row }) =>
          variant === 'driver' ? (
            <IdentityCell
              title={[row.carBrand, row.carModel].filter(Boolean).join(' ') || 'Vehículo'}
              subtitle={row.carPatent ?? undefined}
              monoSubtitle
            />
          ) : (
            <IdentityCell
              title={row.driverName ?? 'Sin nombre'}
              subtitle={row.driverName ? undefined : 'Chofer eliminado'}
              avatarName={row.driverName ?? '?'}
              person={{ deliveryId: row.deliveryId }}
            />
          ),
      },
      {
        field: 'assignedAt',
        headerName: 'Desde',
        width: 170,
        renderCell: ({ row }) => <span className="text-ink">{formatDateTime(row.assignedAt)}</span>,
      },
      {
        field: 'releasedAt',
        headerName: 'Hasta',
        width: 170,
        renderCell: ({ row }) => (
          <span className="text-ink">{row.releasedAt ? formatDateTime(row.releasedAt) : '—'}</span>
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 120,
        sortable: false,
        renderCell: ({ row }) => <Badge label={vehicleAssignmentStatus(row.releasedAt)} />,
      },
      {
        field: 'note',
        headerName: 'Nota',
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: ({ row }) => <span className="truncate text-muted">{row.note ?? '—'}</span>,
      },
    ],
    [variant],
  );

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-outline p-4">
        <CardHeader title={variant === 'driver' ? 'Historial de vehículos' : 'Historial de choferes'} className="" />
        <span className="text-sm text-muted">{total} en total</span>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.assignmentId}
        loading={loading}
        pagination={{ model: pagination, onChange: onPaginationChange, total }}
        onRowClick={
          variant === 'driver'
            ? (row) => navigate(`/cars/details/${row.carId}`)
            : (row) => row.deliveryId && navigate(`/deliveries/details/${row.deliveryId}`)
        }
        empty={
          <EmptyState
            title={variant === 'driver' ? 'Sin vehículos en el historial' : 'Sin choferes en el historial'}
            description={
              variant === 'driver'
                ? 'Todavía no se le asignó ningún vehículo a este chofer.'
                : 'Todavía nadie usó este vehículo.'
            }
          />
        }
      />
    </Card>
  );
};
