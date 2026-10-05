import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FROM_LIST_STATE } from '../../../hooks';
import { ShieldCheck, ShieldX, Star } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import { driverStatus } from '../../../utils/statusLabels';

interface Props {
  rows: Delivery[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  /** Hay filtros activos: un vacío significa "sin resultados". */
  filtered?: boolean;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Sin él no se ofrece (p. ej. superadmin sin distribuidora elegida). */
  onEdit?: (delivery: Delivery) => void;
  onDelete?: (delivery: Delivery) => void;
  /** CU-032, directo desde el listado. */
  onToggleValidated?: (delivery: Delivery) => void;
}

/** Choferes: lo justo para ubicarlos; saldo, vehículos y pedidos van en la ficha. */
export const DeliveriesTable = ({
  rows,
  total,
  loading,
  pagination,
  filtered = false,
  onPaginationChange,
  onEdit,
  onDelete,
  onToggleValidated,
}: Props) => {
  const navigate = useNavigate();
  const columns = useMemo<GridColDef<Delivery>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Chofer',
        flex: 1.6,
        minWidth: 240,
        valueGetter: ({ row }) => row.user?.full_name ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.user?.full_name ?? 'Sin nombre'}
            subtitle={row.user?.email ?? undefined}
            avatarName={row.user?.full_name ?? '?'}
          />
        ),
      },
      {
        field: 'phone',
        headerName: 'Teléfono',
        flex: 1,
        minWidth: 150,
        valueGetter: ({ row }) => row.user?.phone_number ?? '—',
      },
      {
        field: 'calification',
        headerName: 'Calificación',
        width: 120,
        renderCell: ({ row }) =>
          row.calification === null ? (
            <span className="text-muted">Sin calificar</span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-ink">
              <Star aria-hidden="true" className="h-3.5 w-3.5 fill-accent text-accent" />
              {row.calification.toFixed(1)}
            </span>
          ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 140,
        sortable: false,
        renderCell: ({ row }) => <Badge label={driverStatus(row)} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 168,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={row.user?.full_name ?? 'chofer'}
            onView={() => navigate(`/deliveries/details/${row.delivery_id}`, { state: FROM_LIST_STATE })}
            onEdit={onEdit && (() => onEdit(row))}
            onDelete={onDelete && (() => onDelete(row))}
            deleteLabel="Dar de baja"
            actions={[
              ...(onToggleValidated
                ? [
                    row.validated
                      ? {
                          label: 'Invalidar',
                          icon: ShieldX,
                          tone: 'danger' as const,
                          onClick: () => onToggleValidated(row),
                        }
                      : { label: 'Validar', icon: ShieldCheck, onClick: () => onToggleValidated(row) },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    [navigate, onEdit, onDelete, onToggleValidated],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.delivery_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={(row) => navigate(`/deliveries/details/${row.delivery_id}`, { state: FROM_LIST_STATE })}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún chofer coincide con los filtros elegidos."
          />
        ) : (
          <EmptyState
            title="No hay choferes"
            description="Los choferes aparecen cuando se registran en la app o cuando los das de alta."
          />
        )
      }
    />
  );
};
