import type { GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  DataTable,
  EmptyState,
  IdentityCell,
  RowActions,
  UserRefLink,
  type TableColumn,
} from '../../../common/components/ui';
import type { UserAddressConUsuario } from '../../../services/api/types';
import { labelOf } from '../../../utils/statusLabels';
import { ADDRESS_PRECISION } from '../addressPrecision';

interface Props {
  rows: UserAddressConUsuario[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Baja lógica y edición de la dirección; el administrador general las hace desde acá o desde la ficha del cliente. */
  onEdit?: (address: UserAddressConUsuario) => void;
  onDelete?: (address: UserAddressConUsuario) => void;
}

export const AddressesTable = ({ rows, total, loading, pagination, onPaginationChange, onEdit, onDelete }: Props) => {
  const navigate = useNavigate();
  const columns = useMemo<TableColumn<UserAddressConUsuario>[]>(
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
        card: false,
        headerName: 'Precisión',
        width: 140,
        renderCell: ({ row }) => <Badge label={labelOf(ADDRESS_PRECISION, row.geocodePrecision)} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 128,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={`dirección ${row.street}`}
            onView={() => navigate(`/users/details/${row.user_id}`)}
            onEdit={onEdit && (() => onEdit(row))}
            onDelete={onDelete && (() => onDelete(row))}
            deleteLabel="Dar de baja"
          />
        ),
      },
    ],
    [navigate, onEdit, onDelete],
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
