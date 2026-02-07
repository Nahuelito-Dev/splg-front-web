import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTable } from '../../../hooks'; // <--- Usamos el hook estandarizado
import { getAllCars } from '../../../services/api/cars';
import { CustomTable } from '../../../common/components';
import { Car } from '../../../interfaces';

// Iconos
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Tooltip } from '@mui/material';

interface Props {
  setAction: (event: any) => void;
}

const getCarIcon = (type?: string) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('moto')) return <TwoWheelerIcon className="text-indigo-500" />;
  if (t.includes('camion'))
    return <LocalShippingIcon className="text-indigo-500" />;
  return <DirectionsCarIcon className="text-indigo-500" />;
};

export const CarsTable = ({ setAction }: Props) => {
  // 1. Usamos useTable en lugar de useQuery directo para mantener consistencia
  const tableProps = useTable({
    queryKey: 'allCars',
    queryFn: async () => {
      // Adaptador: Como el backend de cars devuelve un array directo,
      // lo convertimos al formato que espera useTable/CustomTable
      const data = await getAllCars();
      return {
        rows: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0,
      };
    },
    dependencies: [],
  });

  const rows = tableProps.data?.rows || [];

  const renderActions = (row: any) => (
    <div className="flex items-center justify-center gap-2">
      <Tooltip title="Editar Vehículo">
        <IconButton
          onClick={() => setAction({ row, field: 'edit' })}
          className="hover:bg-indigo-50"
        >
          <EditIcon className="text-slate-500 hover:text-indigo-600 scale-75" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar">
        <IconButton
          onClick={() => setAction({ row, field: 'delete' })}
          className="hover:bg-rose-50"
        >
          <DeleteOutlineIcon className="text-slate-500 hover:text-rose-600 scale-75" />
        </IconButton>
      </Tooltip>
    </div>
  );

  const columns: GridColDef[] = [
    {
      field: 'car_patent',
      headerName: 'VEHÍCULO',
      flex: 1,
      minWidth: 200,
      // Usamos GridRenderCellParams para tipado correcto
      renderCell: ({ row }: GridRenderCellParams<Car>) => (
        <div className="flex items-center gap-3 py-1">
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
            {getCarIcon(row.type_car)}
          </div>
          <div>
            <span className="block font-bold text-slate-800 text-sm">
              {row.car_brand} {row.car_model}
            </span>
            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 tracking-wider">
              {row.car_patent}
            </span>
          </div>
        </div>
      ),
    },
    {
      field: 'user',
      headerName: 'ASIGNADO A',
      flex: 1,
      renderCell: ({ row }: GridRenderCellParams<any>) => (
        <div className="flex flex-col justify-center">
          <span className="text-sm font-semibold text-slate-700">
            {row.user?.full_name || 'Sin asignar'}
          </span>
          <span className="text-[10px] text-slate-400">{row.user?.email}</span>
        </div>
      ),
    },
    {
      field: 'type_car',
      headerName: 'TIPO',
      width: 120,
    },
    {
      field: 'car_color',
      headerName: 'COLOR',
      width: 120,
    },
    {
      field: 'car_year',
      headerName: 'AÑO',
      width: 100,
      align: 'center',
    },
    {
      field: 'actions',
      headerName: 'ACCIONES',
      width: 120,
      align: 'center',
      renderCell: ({ row }) => renderActions(row),
    },
  ];

  return (
    <CustomTable
      title={'Flota Completa de Vehículos'}
      columns={columns}
      rows={rows}
      getRowId={(row: any) => row.car_id}
      setActive={setAction}
      {...tableProps} // Pasamos todas las props del hook (isLoading, pagination, etc)
    />
  );
};
