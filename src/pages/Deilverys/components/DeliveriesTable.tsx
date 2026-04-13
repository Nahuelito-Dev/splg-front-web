import { useState, useEffect } from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { Link } from 'react-router-dom';
import { useTable } from '../../../hooks';
import { getAllDeliveries } from '../../../services/api/deliveries';
import { CustomTable } from '../../../common/components';

// Iconos
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler'; // Icono Moto
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import CircleIcon from '@mui/icons-material/Circle';
import SearchIcon from '@mui/icons-material/Search';
import { IconButton, Tooltip } from '@mui/material';

interface Props {
  setAction: (event: any) => void;
}

export const DeliveriesTable = ({ setAction }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Efecto para el buscador con retardo (debounce)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const tableProps = useTable({
    queryKey: 'deliveries',
    queryFn: (page, limit) => getAllDeliveries(page, limit, debouncedSearch),
    dependencies: [debouncedSearch],
  });

  const rows = tableProps.data?.rows || [];

  const renderActions = (row: any) => (
    <div className="flex items-center justify-center gap-2">
      <Tooltip title="Ver Detalle y Vehículos">
        <Link to={`/deliveries/details/${row.delivery_id}`}>
          <IconButton className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-8 h-8">
            <VisibilityIcon className="text-slate-600 hover:text-indigo-600 scale-75" />
          </IconButton>
        </Link>
      </Tooltip>

      <Tooltip title="Editar Datos">
        <IconButton
          onClick={() => setAction({ row, field: 'edit' })}
          className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors w-8 h-8"
        >
          <EditIcon className="text-slate-600 hover:text-blue-600 scale-75" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Eliminar">
        <IconButton
          onClick={() => setAction({ row, field: 'delete' })}
          className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-colors w-8 h-8"
        >
          <DeleteOutlineIcon className="text-slate-600 hover:text-rose-600 scale-75" />
        </IconButton>
      </Tooltip>
    </div>
  );

  const columns: GridColDef[] = [
    {
      field: 'full_name',
      headerName: 'REPARTIDOR',
      flex: 1.5,
      minWidth: 200,
      renderCell: ({ row }) => (
        <div className="flex items-center gap-3 py-1">
          <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
            <TwoWheelerIcon className="text-indigo-500" fontSize="small" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-sm">
              {row.user?.full_name || 'Sin Nombre'}
            </span>
            <span className="text-[10px] text-slate-400">
              {row.user?.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      field: 'phone',
      headerName: 'TELÉFONO',
      width: 140,
      renderCell: ({ row }) => (
        <span className="text-sm text-slate-600">{row.user?.phone_number}</span>
      ),
    },
    {
      field: 'balance',
      headerName: 'BALANCE',
      width: 120,
      renderCell: ({ value }) => (
        <span
          className={`font-bold ${value < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
        >
          $ {Number(value || 0).toLocaleString()}
        </span>
      ),
    },
    {
      field: 'calification',
      headerName: 'CALIF.',
      width: 100,
      renderCell: ({ value }) => (
        <div className="flex items-center gap-1 text-amber-500 font-bold">
          <StarIcon fontSize="small" /> {Number(value || 5).toFixed(1)}
        </div>
      ),
    },
    {
      field: 'currentStatus',
      headerName: 'ESTADO',
      width: 140,
      align: 'center',
      renderCell: ({ row }) => {
        const statusStr = row.currentStatus || (row.isActive ? 'ACTIVE' : 'INACTIVE');
        let bgClass = 'bg-slate-100 text-slate-500';
        let label = 'INACTIVO';

        if (statusStr === 'BUSY') {
          bgClass = 'bg-orange-100 text-orange-700';
          label = 'EN ENTREGA';
        } else if (statusStr === 'ACTIVE') {
          bgClass = 'bg-emerald-100 text-emerald-700';
          label = 'ACTIVO';
        }

        return (
          <div
            className={`flex items-center justify-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide w-full ${bgClass}`}
          >
            <CircleIcon sx={{ fontSize: 8 }} />
            {label}
          </div>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'ACCIONES',
      width: 160,
      align: 'center',
      renderCell: ({ row }) => renderActions(row),
    },
  ];

  return (
    <CustomTable
      title={'Flota de Repartidores'}
      columns={columns}
      rows={rows}
      getRowId={(row: any) => row.delivery_id}
      setActive={setAction}
      {...tableProps}
    >
      <div className="relative group w-full sm:w-72">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input
          type="text"
          style={{ paddingLeft: '42px' }}
          className="block w-full pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
          placeholder="Buscar repartidor por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </CustomTable>
  );
};
