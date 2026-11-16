import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, type ReactNode } from 'react';
import { Cylinder as CylinderIcon } from 'lucide-react';
import { Badge, DataTable, IdentityCell, RowActions } from '../../../common/components/ui';
import type { CylinderVencimiento } from '../../../services/api/types';
import { formatArgentinaDay } from '../../../utils/format';
import { CYLINDER_STATE, CYLINDER_VIGENCIA, labelOf } from '../../../utils/statusLabels';
import { daysLabel } from '../inspection';

interface Props {
  rows: CylinderVencimiento[];
  loading: boolean;
  empty: ReactNode;
  onView: (cylinder: CylinderVencimiento) => void;
}

/** Los envases de un grupo del listado de vencimientos; el orden (más urgente primero) lo da la API. */
export const ExpiringCylindersTable = ({ rows, loading, empty, onView }: Props) => {
  const columns = useMemo<GridColDef<CylinderVencimiento>[]>(
    () => [
      {
        field: 'serial',
        headerName: 'Envase',
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <IdentityCell title={row.serial} subtitle={row.productType ?? 'Sin producto asignado'} icon={CylinderIcon} />
        ),
      },
      {
        field: 'state',
        headerName: 'Estado',
        width: 150,
        sortable: false,
        renderCell: ({ row }) => <Badge label={labelOf(CYLINDER_STATE, row.state)} />,
      },
      {
        field: 'expiresAt',
        headerName: 'Vencimiento',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-ink">{formatArgentinaDay(row.expiresAt)}</span>
            <span className="text-xs text-muted">{daysLabel(row.status, row.daysRemaining)}</span>
          </div>
        ),
      },
      {
        field: 'status',
        headerName: 'Vigencia',
        width: 190,
        sortable: false,
        renderCell: ({ row }) => <Badge label={labelOf(CYLINDER_VIGENCIA, row.status)} variant="critical" />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 80,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => <RowActions rowLabel={`envase ${row.serial}`} onView={() => onView(row)} />,
      },
    ],
    [onView],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.cylinderId}
      loading={loading}
      onRowClick={onView}
      empty={empty}
    />
  );
};
