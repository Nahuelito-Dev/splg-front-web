import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, UserRefLink } from '../../../common/components/ui';
import type { UserAddressConUsuario } from '../../../services/api/types';
import { labelOf } from '../../../utils/statusLabels';
import { ADDRESS_PRECISION } from '../addressPrecision';

interface Props {
  rows: UserAddressConUsuario[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
}

export const AddressesTable = ({ rows, total, loading, pagination, onPaginationChange }: Props) => {
  const columns = useMemo<GridColDef<UserAddressConUsuario>[]>(
    () => [
      {
        field: 'street',
        headerName: 'Dirección',
        flex: 1.4,
        minWidth: 240,
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.street}
            subtitle={[row.floor && `Piso ${row.floor}`, row.apartment && `Depto ${row.apartment}`, row.postalCode]
              .filter(Boolean)
              .join(' · ')}
            icon={MapPin}
          />
        ),
      },
      { field: 'city', headerName: 'Ciudad', flex: 0.8, minWidth: 130 },
      {
        field: 'user',
        headerName: 'Cliente',
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }) => <UserRefLink userId={row.user_id} name={row.user?.full_name} className="truncate" />,
      },
      {
        field: 'isDefault',
        headerName: 'Predeterminada',
        width: 150,
        renderCell: ({ row }) =>
          row.isDefault ? (
            <Badge label={{ text: 'Predeterminada', tone: 'primary' }} />
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        field: 'geocodePrecision',
        headerName: 'Precisión',
        width: 140,
        renderCell: ({ row }) => <Badge label={labelOf(ADDRESS_PRECISION, row.geocodePrecision)} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.address_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      empty={
        <EmptyState title="No hay direcciones" description="Todavía ningún cliente cargó una dirección de entrega." />
      }
    />
  );
};
