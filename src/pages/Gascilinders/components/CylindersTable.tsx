import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTable } from '../../../hooks';
import { getAllCylinders } from '../../../services/api/cylinders';
import { CustomTable } from '../../../common/components';
import { GasCylinder } from '../../../interfaces';
import { Link } from 'react-router-dom';

// Iconos
import PropaneIcon from '@mui/icons-material/Propane';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility'; // Icono para ver detalles
import { IconButton, Tooltip } from '@mui/material';

interface Props {
  setLocalAction: (event: any) => void;
}

export const CylindersTable = ({ setLocalAction }: Props) => {
  // Configuración del hook de tabla (React Query)
  const tableProps = useTable({
    queryKey: 'gascylinders',
    queryFn: (page, limit) => getAllCylinders(page, limit),
    dependencies: [],
  });

  const rows = tableProps.data?.rows || [];

  const renderActions = (row: any) => (
    <div className="flex items-center justify-center gap-2">
      {/* 1. Ver Detalle (NUEVO) */}
      <Tooltip title="Ver Detalles y Promociones">
        <Link to={`/cylinders/details/${row.gas_cylinder_id}`}>
          <IconButton className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-sky-50 hover:border-sky-200 transition-colors w-8 h-8">
            <VisibilityIcon className="text-slate-600 hover:text-sky-600 scale-75" />
          </IconButton>
        </Link>
      </Tooltip>

      {/* 2. Editar (Abre Modal) */}
      <Tooltip title="Editar Producto">
        <IconButton
          onClick={() => setLocalAction({ row, field: 'edit' })}
          className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors w-8 h-8"
        >
          <EditIcon className="text-slate-600 hover:text-indigo-600 scale-75" />
        </IconButton>
      </Tooltip>

      {/* 3. Ajustar Stock (SweetAlert) */}
      <Tooltip title="Ajustar Stock (Entrada/Salida)">
        <IconButton
          onClick={() => setLocalAction({ row, field: 'stock' })}
          className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-colors w-8 h-8"
        >
          <AddCircleOutlineIcon className="text-slate-600 hover:text-emerald-600 scale-75" />
        </IconButton>
      </Tooltip>

      {/* 4. Desactivar */}
      <Tooltip title="Desactivar">
        <IconButton
          onClick={() => setLocalAction({ row, field: 'delete' })}
          className="bg-slate-50 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-colors w-8 h-8"
        >
          <DeleteOutlineIcon className="text-slate-600 hover:text-rose-600 scale-75" />
        </IconButton>
      </Tooltip>
    </div>
  );

  const columns: GridColDef[] = [
    {
      field: 'type',
      headerName: 'PRODUCTO',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }: GridRenderCellParams<GasCylinder>) => (
        <div className="flex items-center gap-3 py-1">
          {/* Branding Icon */}
          <div className="p-2 bg-pink-50 rounded-lg border border-pink-100">
            <PropaneIcon className="text-pink-500" fontSize="medium" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-sm">
              Garrafa {row.type}
            </span>
            <span className="text-xs text-slate-400">{row.weight} kg</span>
          </div>
        </div>
      ),
    },
    {
      field: 'price',
      headerName: 'PRECIO',
      width: 120,
      renderCell: ({ value }) => (
        <span className="font-bold text-slate-700">
          $ {Number(value).toLocaleString('es-AR')}
        </span>
      ),
    },
    {
      field: 'stock',
      headerName: 'STOCK',
      width: 100,
      align: 'center',
      renderCell: ({ value }) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            value > 20
              ? 'bg-emerald-100 text-emerald-700'
              : value > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700'
          }`}
        >
          {value} u.
        </span>
      ),
    },
    {
      field: 'description',
      headerName: 'DESCRIPCIÓN',
      flex: 1.5,
      minWidth: 200,
      renderCell: ({ value }) => (
        <span
          className="text-xs text-slate-500 truncate block w-full"
          title={value}
        >
          {value || 'Sin descripción'}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'ACCIONES',
      width: 180, // Aumenté el ancho para que quepan los 4 botones
      align: 'center',
      renderCell: ({ row }) => renderActions(row),
    },
  ];

  return (
    <CustomTable
      title={'Inventario de Garrafas'}
      columns={columns}
      rows={rows}
      getRowId={(row: any) => row.gas_cylinder_id}
      setActive={setLocalAction}
      {...tableProps}
    />
  );
};
