import { useState, useEffect } from 'react';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Link } from 'react-router-dom';
import { useTable } from '../../../hooks';
import { getAllCustomers } from '../../../services/api/customers';
import { CustomTable } from '../../../common/components';

// Iconos
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { IconButton, Tooltip } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  setAction: (event: any) => void;
}

export const CustomersTable = ({ setAction }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Efecto para el buscador con retardo (debounce)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const tableProps = useTable({
    queryKey: 'customers',
    queryFn: (page, limit) => getAllCustomers(page, limit, debouncedSearch),
    dependencies: [debouncedSearch],
  });

  const rows = tableProps.data?.rows || tableProps.data || [];

  const renderActions = (row: any) => (
    <div className="flex items-center justify-center gap-2">
      {/* --- BOTÓN VER DETALLE (CORREGIDO) --- */}
      <Tooltip title="Ver Perfil y Direcciones">
        {/* Ahora apunta a la ruta de Cliente, usando customer_id */}
        <Link to={`/customers/details/${row.customer_id}`}>
          <IconButton className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-9 h-9">
            <InfoOutlinedIcon className="text-slate-600 hover:text-indigo-600 scale-75" />
          </IconButton>
        </Link>
      </Tooltip>

      <Tooltip title="Eliminar Cliente">
        <IconButton
          onClick={() => setAction({ row, field: 'delete' })}
          className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-colors w-9 h-9"
        >
          <DeleteOutlineIcon className="text-slate-600 hover:text-rose-600 scale-75" />
        </IconButton>
      </Tooltip>
    </div>
  );

  const columns: GridColDef[] = [
    {
      flex: 1.5,
      field: 'email',
      headerName: 'EMAIL',
      minWidth: 200,
      renderCell: ({ row }) => (
        <span className="font-semibold text-slate-700">
          {row.user?.email || 'S/D'}
        </span>
      ),
    },
    {
      flex: 1,
      field: 'full_name',
      headerName: 'NOMBRE',
      minWidth: 150,
      renderCell: ({ row }) => <span>{row.user?.full_name || 'S/D'}</span>,
    },
    {
      field: 'role',
      headerName: 'ROL',
      width: 130,
      renderCell: ({ row }) => (
        <div className="flex items-center h-full">
          <span className="px-2 py-1 rounded-md text-xs font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 tracking-wider">
            {row.user?.role?.type || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      flex: 1,
      field: 'phone_number',
      headerName: 'TELÉFONO',
      minWidth: 130,
      renderCell: ({ row }) => <span>{row.user?.phone_number || 'S/D'}</span>,
    },
    {
      field: 'validated',
      headerName: 'VALIDADO',
      width: 130,
      align: 'center',
      renderCell: ({ row }: GridRenderCellParams) => (
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
            row.validated === 'true'
              ? 'bg-blue-50 text-blue-700 border-blue-100'
              : 'bg-amber-50 text-amber-700 border-amber-100'
          }`}
        >
          {row.validated === 'true' ? (
            <>
              <VerifiedIcon sx={{ fontSize: 14 }} /> Verificado
            </>
          ) : (
            <>
              <NewReleasesIcon sx={{ fontSize: 14 }} /> Pendiente
            </>
          )}
        </div>
      ),
    },
    {
      field: 'actions',
      headerName: 'ACCIONES',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }: GridRenderCellParams) => renderActions(row),
    },
  ];

  return (
    <CustomTable
      title={'Listado de Clientes'}
      columns={columns}
      rows={rows}
      getRowId={(row: any) => row.customer_id}
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
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </CustomTable>
  );
};
