import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import { carIcon } from './carIcon';
import type { Car } from '../../../services/api/types';

interface Props {
  rows: Car[];
  loading: boolean;
  onView: (car: Car) => void;
  /** Sin él no se muestra el botón (p. ej. superadmin sin distribuidora elegida). */
  onEdit?: (car: Car) => void;
  onDelete?: (car: Car) => void;
  /** Hay una patente buscada: la tabla vacía es «sin coincidencias», no «no hay vehículos». */
  searching?: boolean;
  /** La búsqueda por patente falló: no se sabe si existe, no es «sin resultados». */
  searchFailed?: boolean;
}

export const CarsTable = ({
  rows,
  loading,
  onView,
  onEdit,
  onDelete,
  searching = false,
  searchFailed = false,
}: Props) => {
  const columns = useMemo<GridColDef<Car>[]>(
    () => [
      {
        field: 'car_patent',
        headerName: 'Vehículo',
        flex: 1.3,
        minWidth: 220,
        renderCell: ({ row }) => (
          <IdentityCell
            title={[row.car_brand, row.car_model].filter(Boolean).join(' ') || 'Vehículo'}
            subtitle={row.car_patent ?? undefined}
            icon={carIcon(row.type_car)}
            monoSubtitle
            photo={{ kind: 'car', id: row.car_id, url: row.photoUrl }}
          />
        ),
      },
      {
        field: 'user',
        headerName: 'Asignado a',
        flex: 1.2,
        minWidth: 200,
        valueGetter: ({ row }) => row.user?.full_name ?? '',
        renderCell: ({ row }) =>
          row.user ? (
            <IdentityCell
              title={row.user.full_name ?? 'Sin nombre'}
              avatarName={row.user.full_name ?? '?'}
              photo={{ kind: 'user', id: row.user.user_id, url: row.user.photoUrl }}
            />
          ) : (
            <span className="text-muted">Sin asignar</span>
          ),
      },
      { field: 'type_car', headerName: 'Tipo', width: 130, valueGetter: ({ row }) => row.type_car ?? '—' },
      {
        field: 'actions',
        headerName: '',
        width: 136,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={row.car_patent ?? 'vehículo'}
            onView={() => onView(row)}
            onEdit={onEdit && (() => onEdit(row))}
            onDelete={onDelete && (() => onDelete(row))}
          />
        ),
      },
    ],
    [onView, onEdit, onDelete],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.car_id}
      loading={loading}
      onRowClick={onView}
      empty={
        searchFailed ? (
          <EmptyState title="No se pudo buscar" description="Probá de nuevo en unos segundos." />
        ) : searching ? (
          <EmptyState title="Sin resultados" description="No hay un vehículo con esa patente." />
        ) : (
          <EmptyState title="No hay vehículos" description="Agregá uno para que un chofer pueda empezar a operar." />
        )
      }
    />
  );
};
