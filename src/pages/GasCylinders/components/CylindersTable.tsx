import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, PackagePlus } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { GasCylinder } from '../../../services/api/types';
import { formatCurrency } from '../../../utils/format';
import { stockLabel } from './stockLabel';

interface Props {
  rows: GasCylinder[];
  total: number;
  loading: boolean;
  /** Hay filtros activos: un vacío significa "sin resultados". */
  filtered?: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Sin él no se muestra el botón (p. ej. superadmin sin distribuidora elegida). */
  onEdit?: (cylinder: GasCylinder) => void;
  onAdjustStock?: (cylinder: GasCylinder) => void;
  onDelete?: (cylinder: GasCylinder) => void;
}

export const CylindersTable = ({
  filtered = false,
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  onEdit,
  onAdjustStock,
  onDelete,
}: Props) => {
  const navigate = useNavigate();
  const columns = useMemo<GridColDef<GasCylinder>[]>(
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
        width: 130,
        valueGetter: ({ row }) => formatCurrency(row.price),
        cellClassName: 'font-mono',
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
            onEdit={onEdit && (() => onEdit(row))}
            onDelete={onDelete && (() => onDelete(row))}
            deleteLabel="Desactivar"
            actions={
              onAdjustStock ? [{ label: 'Ajustar stock', icon: PackagePlus, onClick: () => onAdjustStock(row) }] : []
            }
          />
        ),
      },
    ],
    [navigate, onEdit, onAdjustStock, onDelete],
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
