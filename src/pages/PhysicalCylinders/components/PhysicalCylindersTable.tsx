import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { ArrowRightLeft, Cylinder as CylinderIcon } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { formatCurrency } from '../../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';

interface Props {
  rows: Cylinder[];
  loading: boolean;
  /** Sin él no se muestra el botón (p. ej. superadmin sin distribuidora elegida). */
  onTransition?: (cylinder: Cylinder) => void;
  onView: (cylinder: Cylinder) => void;
}

export const PhysicalCylindersTable = ({ rows, loading, onTransition, onView }: Props) => {
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
          <span className="font-mono text-ink">{row.deposit > 0 ? formatCurrency(row.deposit) : '—'}</span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 96,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={`envase ${row.serial}`}
            onView={() => onView(row)}
            actions={
              onTransition ? [{ label: 'Mover de estado', icon: ArrowRightLeft, onClick: () => onTransition(row) }] : []
            }
          />
        ),
      },
    ],
    [onTransition, onView],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.cylinder_id}
      loading={loading}
      onRowClick={onView}
      empty={
        <EmptyState
          title="No hay envases"
          description="Todavía no diste de alta ningún envase físico en este estado."
        />
      }
    />
  );
};
