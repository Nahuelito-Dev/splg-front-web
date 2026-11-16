import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, PackagePlus, RotateCcw } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { CatalogCylinder } from '../../../services/api/gasCylinders';
import { formatCurrency } from '../../../utils/format';
import { stockLabel } from './stockLabel';

interface Props {
  rows: CatalogCylinder[];
  total: number;
  loading: boolean;
  /** Hay filtros activos: un vacío significa "sin resultados". */
  filtered?: boolean;
  /** Vista de los productos dados de baja (CU-269): sólo se pueden ver y reactivar. */
  inactive?: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Sin él no se muestra el botón (p. ej. superadmin sin distribuidora elegida). */
  onEdit?: (cylinder: CatalogCylinder) => void;
  onAdjustStock?: (cylinder: CatalogCylinder) => void;
  onDelete?: (cylinder: CatalogCylinder) => void;
  /** Reactivar un producto dado de baja (CU-268); sólo se usa en la vista de inactivos. */
  onReactivate?: (cylinder: CatalogCylinder) => void;
}

export const CylindersTable = ({
  filtered = false,
  inactive = false,
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  onEdit,
  onAdjustStock,
  onDelete,
  onReactivate,
}: Props) => {
  const navigate = useNavigate();
  const columns = useMemo<GridColDef<CatalogCylinder>[]>(
    () => [
      {
        field: 'type',
        headerName: 'Producto',
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.type}
            subtitle={`${row.weight} kg`}
            icon={Flame}
            photo={{ kind: 'gasCylinder', id: row.gas_cylinder_id, url: row.photoUrl }}
          />
        ),
      },
      {
        field: 'price',
        headerName: 'Precio',
        width: 150,
        valueGetter: ({ row }) => formatCurrency(row.price),
        renderCell: ({ row }) => (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="tabular-nums text-ink">{formatCurrency(row.price)}</span>
            <span className="truncate text-xs text-muted">
              {row.container_price === null || row.container_price === undefined
                ? 'Envase sin cargar'
                : `Envase ${formatCurrency(row.container_price)}`}
            </span>
          </div>
        ),
      },
      {
        field: 'stock',
        headerName: 'Stock',
        width: 110,
        renderCell: ({ row }) => <Badge label={stockLabel(row.stock)} />,
      },
      {
        field: 'promotions',
        headerName: 'Promos',
        width: 90,
        align: 'center',
        headerAlign: 'center',
        valueGetter: ({ row }) => row.promotions?.length ?? 0,
      },
      {
        field: 'actions',
        headerName: '',
        width: 168,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={row.type}
            onView={() => navigate(`/cylinders/details/${row.gas_cylinder_id}`)}
            onEdit={!inactive && onEdit ? () => onEdit(row) : undefined}
            onDelete={!inactive && onDelete ? () => onDelete(row) : undefined}
            deleteLabel="Desactivar"
            actions={
              inactive
                ? onReactivate
                  ? [{ label: 'Reactivar', icon: RotateCcw, onClick: () => onReactivate(row) }]
                  : []
                : onAdjustStock
                  ? [{ label: 'Ajustar stock', icon: PackagePlus, onClick: () => onAdjustStock(row) }]
                  : []
            }
          />
        ),
      },
    ],
    [navigate, inactive, onEdit, onAdjustStock, onDelete, onReactivate],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.gas_cylinder_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={(row) => navigate(`/cylinders/details/${row.gas_cylinder_id}`)}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún producto coincide con los filtros elegidos."
          />
        ) : inactive ? (
          <EmptyState title="No hay productos dados de baja" description="Todos los productos están activos." />
        ) : (
          <EmptyState
            title="No hay productos"
            description="Cargá el primer tipo de garrafa que vende la distribuidora."
          />
        )
      }
    />
  );
};
