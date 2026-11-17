import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { ArrowRightLeft, Cylinder as CylinderIcon } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { canEditCylinder, canRetire } from '../cylinderTransitions';
import { formatCurrency, formatDate } from '../../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';

interface Props {
  rows: Cylinder[];
  /** Total sin paginar (de la API). */
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Sin él no se muestra el botón (p. ej. superadmin sin distribuidora elegida). */
  onTransition?: (cylinder: Cylinder) => void;
  onView: (cylinder: Cylinder) => void;
  /** Sin él no se muestra «Editar». Un envase retirado no se edita. */
  onEdit?: (cylinder: Cylinder) => void;
  /** Baja lógica; sólo se ofrece en los estados desde los que el back la acepta. */
  onRetire?: (cylinder: Cylinder) => void;
  /** Hay filtros activos: un vacío significa "sin resultados". */
  filtered?: boolean;
  /** Selección múltiple para las acciones en lote (sólo con permiso de escritura). */
  selection?: { ids: string[]; onChange: (ids: string[]) => void };
  /** Se cambió de página de la tabla. */
  onPageChange?: () => void;
}

export const PhysicalCylindersTable = ({
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  onTransition,
  onView,
  onEdit,
  onRetire,
  filtered = false,
  selection,
  onPageChange,
}: Props) => {
  const columns = useMemo<GridColDef<Cylinder>[]>(
    () => [
      {
        field: 'serial',
        headerName: 'Envase',
        flex: 1.2,
        minWidth: 220,
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.serial}
            subtitle={
              row.gas_cylinder ? `${row.gas_cylinder.type} · ${row.gas_cylinder.weight} kg` : 'Sin producto asignado'
            }
            icon={CylinderIcon}
          />
        ),
      },
      {
        field: 'state',
        headerName: 'Estado',
        width: 150,
        renderCell: ({ row }) => <Badge label={labelOf(CYLINDER_STATE, row.state)} />,
      },
      {
        field: 'current_customer',
        headerName: 'En poder de',
        flex: 1,
        minWidth: 180,
        sortable: false,
        valueGetter: ({ row }) => row.current_customer?.full_name ?? '',
        renderCell: ({ row }) =>
          row.current_customer ? (
            <IdentityCell
              title={row.current_customer.full_name ?? 'Cliente sin nombre'}
              avatarName={row.current_customer.full_name ?? '?'}
              person={{ userId: row.current_customer.user_id }}
            />
          ) : (
            <span className="text-muted">La distribuidora</span>
          ),
      },
      {
        field: 'deposit',
        headerName: 'Garantía',
        width: 120,
        renderCell: ({ row }) => (
          <span className="tabular-nums text-ink">{row.deposit > 0 ? formatCurrency(row.deposit) : '—'}</span>
        ),
      },
      {
        field: 'lastMovementAt',
        headerName: 'Último movimiento',
        width: 160,
        sortable: false,
        valueGetter: ({ row }) => (row.lastMovementAt ? formatDate(row.lastMovementAt) : '—'),
      },
      {
        field: 'actions',
        headerName: '',
        width: 128,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={`envase ${row.serial}`}
            onView={() => onView(row)}
            onEdit={onEdit && canEditCylinder(row) ? () => onEdit(row) : undefined}
            onDelete={onRetire && canRetire(row) ? () => onRetire(row) : undefined}
            deleteLabel="Dar de baja"
            actions={
              onTransition && row.state !== 'retired'
                ? [{ label: 'Mover de estado', icon: ArrowRightLeft, onClick: () => onTransition(row) }]
                : []
            }
          />
        ),
      },
    ],
    [onTransition, onView, onEdit, onRetire],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.cylinder_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={onView}
      selection={selection && { ...selection, isSelectable: canEditCylinder }}
      onPageChange={onPageChange}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún envase coincide con los filtros elegidos."
          />
        ) : (
          <EmptyState title="No hay envases" description="Todavía no diste de alta ningún envase físico." />
        )
      }
    />
  );
};
