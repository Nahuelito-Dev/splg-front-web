import { useState, useEffect } from 'react';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTable } from '../../../hooks';
import { getAllUsers } from '../../../services/api/users';
import { CustomTable } from '../../../common/components';

// Iconos Material UI
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  setLead: (event: any) => void;
}

export const LeadsTable = ({ setLead }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // 1. Efecto Debounce: Espera 500ms antes de actualizar la búsqueda real
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Hook de Tabla Configurado Correctamente
  const tableProps = useTable({
    queryKey: 'users', // String fijo: Evita el error "charAt is not a function"
    queryFn: (page, limit) => getAllUsers(page, limit, debouncedSearch),
    dependencies: [debouncedSearch], // Array: React Query recarga si esto cambia
  });

  // Renderizado de Botones de Acción
  const renderActions = (row: any) => (
    <div className="flex items-center justify-center gap-2">
      <Tooltip title="Ver detalles / Editar">
        <IconButton
          onClick={() => setLead({ row, field: 'edit' })}
          className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-9 h-9"
        >
          <InfoOutlinedIcon className="text-slate-600 hover:text-indigo-600 scale-75" />
        </IconButton>
      </Tooltip>

      <Tooltip title={row.blocked ? 'DESBLOQUEAR' : 'BLOQUEAR'}>
        <IconButton
          onClick={() => setLead({ row, field: 'block' })}
          className={`bg-slate-50 border border-slate-200 rounded-xl transition-colors w-9 h-9 ${
            row.blocked
              ? 'hover:bg-emerald-50 hover:border-emerald-200'
              : 'hover:bg-amber-50 hover:border-amber-200'
          }`}
        >
          {row.blocked ? (
            <LockOpenIcon className="text-slate-600 hover:text-emerald-600 scale-75" />
          ) : (
            <BlockIcon className="text-slate-600 hover:text-amber-600 scale-75" />
          )}
        </IconButton>
      </Tooltip>

      <Tooltip title="ELIMINAR PERMANENTE">
        <IconButton
          onClick={() => setLead({ row, field: 'delete' })}
          className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-colors w-9 h-9"
        >
          <DeleteOutlineIcon className="text-slate-600 hover:text-rose-600 scale-75" />
        </IconButton>
      </Tooltip>
    </div>
  );

  // Definición de Columnas
  const columns: GridColDef[] = [
    {
      flex: 1.5,
      field: 'email',
      headerName: 'EMAIL',
      minWidth: 200,
      renderCell: ({ value }) => (
        <span className="font-semibold text-slate-700">{value}</span>
      ),
    },
    { flex: 1, field: 'full_name', headerName: 'NOMBRE', minWidth: 150 },
    { flex: 1, field: 'phone_number', headerName: 'TELÉFONO', minWidth: 130 },
    {
      field: 'blocked',
      headerName: 'ESTADO',
      width: 130,
      align: 'center',
      renderCell: ({ row }: GridRenderCellParams) => (
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
            !row.blocked
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}
        >
          {!row.blocked ? (
            <CheckCircleIcon sx={{ fontSize: 14 }} />
          ) : (
            <CloseIcon sx={{ fontSize: 14 }} />
          )}
          {!row.blocked ? 'Activo' : 'Bloqueado'}
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
      title={'Directorio de Usuarios'}
      columns={columns}
      rows={tableProps.data?.users || []}
      // Clave vital para DataGrid usando datos de NestJS (UUID)
      getRowId={(row: any) => row.user_id}
      setActive={setLead}
      {...tableProps}
    >
      {/* Buscador Integrado Estilo Tailwind */}
      <div className="relative group w-full sm:w-72">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input
          type="text"
          style={{ paddingLeft: '42px' }}
          className="block w-full pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
          placeholder="Buscar por email, nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </CustomTable>
  );
};
