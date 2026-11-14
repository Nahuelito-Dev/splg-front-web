import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Ban, CircleCheck, LifeBuoy } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Distributor } from '../../../services/api/types';
import { DISTRIBUTOR_STATUS, labelOf } from '../../../utils/statusLabels';

interface Props {
  rows: Distributor[];
  loading: boolean;
  /** Abre el pedido de acceso de soporte con la empresa elegida. */
  onRequestSupport: (distributor: Distributor) => void;
  onView: (distributor: Distributor) => void;
  onEdit: (distributor: Distributor) => void;
  onToggleStatus: (distributor: Distributor) => void;
  onDelete: (distributor: Distributor) => void;
}

export const DistributorsTable = ({
  rows,
  loading,
  onRequestSupport,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: Props) => {
  const columns = useMemo<GridColDef<Distributor>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Empresa',
        flex: 1.3,
        minWidth: 200,
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.name}
            subtitle={row.slug}
            avatarName={row.name}
            monoSubtitle
            photo={{ kind: 'distributor', id: row.distributor_id, url: row.photoUrl ?? row.logo_url }}
          />
        ),
      },
      {
        field: 'contact',
        headerName: 'Contacto',
        flex: 1.2,
        minWidth: 200,
        valueGetter: ({ row }) => row.email ?? row.phone ?? '',
        renderCell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-ink">{row.email ?? '—'}</p>
            <p className="truncate text-xs text-muted">{row.phone ?? '—'}</p>
          </div>
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ row }) => <Badge label={labelOf(DISTRIBUTOR_STATUS, row.status)} variant="critical" />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 90,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
            <RowActions
              rowLabel={row.name}
              onView={() => onView(row)}
              onEdit={() => onEdit(row)}
              onDelete={() => onDelete(row)}
              deleteLabel="Dar de baja"
              actions={[
                { label: 'Pedir acceso de soporte', icon: LifeBuoy, onClick: () => onRequestSupport(row) },
                row.status === 'active'
                  ? { label: 'Suspender', icon: Ban, tone: 'danger', onClick: () => onToggleStatus(row) }
                  : { label: 'Activar', icon: CircleCheck, onClick: () => onToggleStatus(row) },
              ]}
            />
          </div>
        ),
      },
    ],
    [onRequestSupport, onView, onEdit, onToggleStatus, onDelete],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.distributor_id}
      loading={loading}
      onRowClick={onView}
      empty={<EmptyState title="Sin empresas" description="Todavía no diste de alta ninguna distribuidora." />}
    />
  );
};
