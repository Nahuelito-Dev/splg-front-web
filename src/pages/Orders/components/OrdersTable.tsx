import { useState, useEffect } from 'react';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTable } from '../../../hooks';
import { getAllOrders, Order } from '../../../services/api/orders';
import { CustomTable } from '../../../common/components';

// UI & Icons
import { IconButton, Tooltip } from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CircleIcon from '@mui/icons-material/Circle';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  onAssign: (order: Order) => void;
  onCancel: (order: Order) => void;
  onView: (order: Order) => void; // <--- FALTABA ESTO
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'text-orange-600 bg-orange-50 border-orange-100';
    case 'accepted':
      return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'on_the_way':
    case 'out_for_delivery':
      return 'text-indigo-600 bg-indigo-50 border-indigo-100';
    case 'delivered':
      return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'cancelled':
      return 'text-rose-600 bg-rose-50 border-rose-100';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-100';
  }
};

const getStatusLabel = (status: string) => {
  const labels: any = {
    pending: 'Pendiente',
    accepted: 'Aceptado',
    on_the_way: 'En Camino',
    out_for_delivery: 'En Camino',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status.replace(/_/g, ' ');
};

export const OrdersTable = ({ onAssign, onCancel, onView }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const tableProps = useTable({
    queryKey: 'orders',
    queryFn: async (page, limit) => {
      const data = await getAllOrders(page, limit, debouncedSearch, startDate, endDate);
      // Adaptamos la respuesta si el backend devuelve { orders: [], total: N }
      return { rows: data.orders, total: data.total };
    },
    dependencies: [debouncedSearch, startDate, endDate],
  });

  const renderActions = (row: Order) => (
    <div className="flex items-center justify-center gap-1">
      {/* 1. Ver Detalle (Ahora sí funciona) */}
      <Tooltip title="Ver Detalles">
        <IconButton
          onClick={() => onView(row)} // <--- CONECTADO
          className="hover:bg-slate-100"
        >
          <RemoveRedEyeIcon fontSize="small" className="text-slate-400" />
        </IconButton>
      </Tooltip>

      {/* 2. Asignar (Solo si NO está entregado/cancelado) */}
      {!['delivered', 'cancelled'].includes(row.status) && (
        <Tooltip title="Asignar / Reasignar">
          <IconButton
            onClick={() => onAssign(row)}
            className="hover:bg-indigo-50"
          >
            <AssignmentIndIcon fontSize="small" className="text-indigo-600" />
          </IconButton>
        </Tooltip>
      )}

      {/* 3. Cancelar */}
      {!['delivered', 'cancelled'].includes(row.status) && (
        <Tooltip title="Cancelar Pedido">
          <IconButton
            onClick={() => onCancel(row)}
            className="hover:bg-rose-50"
          >
            <CancelIcon fontSize="small" className="text-rose-500" />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );


  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 90,
      renderCell: ({ row }) => (
        <span className="text-xs font-mono text-slate-400">
          ...{((row as any).order_id || row.id).slice(-6)}
        </span>
      ),
    },
    {
      field: 'customer',
      headerName: 'CLIENTE',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }: GridRenderCellParams<Order>) => {
        const r = row as any;
        return (
          <div className="flex flex-col py-1">
            <span className="font-bold text-slate-700 text-sm">
              {r.customer_name || 'Anónimo'}
            </span>
            <span className="text-[10px] text-slate-400">
              {r.delivery_address?.street || 'Sin dirección'}
            </span>
          </div>
        );
      },
    },
    {
      field: 'date',
      headerName: 'FECHA',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      valueGetter: ({ row }) => {
        const r = row as Order;
        const raw = row as any;
        const dateVal = r.createdAt || raw.created_at || raw.createdAt;
        return dateVal ? new Date(dateVal).getTime() : 0;
      },
      renderCell: ({ value }) => {
        if (!value) return '-- --';
        const date = new Date(value);
        return (
          <span className="text-xs font-medium text-slate-500 italic">
            {date.toLocaleString()}
          </span>
        );
      },
    },
    {
      field: 'status',
      headerName: 'ESTADO',
      width: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) => {
        return (
          <span
            className={`inline-flex items-center justify-center w-full gap-1 px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getStatusColor(
              value,
            )}`}
          >
            <CircleIcon sx={{ fontSize: 6 }} color="inherit" />
            {getStatusLabel(value)}
          </span>
        );
      },
    },
    {
      field: 'delivery',
      headerName: 'REPARTIDOR',
      flex: 1,
      renderCell: ({ row }: GridRenderCellParams<Order>) => {
        const r = row as any;
        return r.delivery_name ? (
          <div className="flex w-max items-center gap-2 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
            <LocalShippingIcon fontSize="small" />
            <span className="text-xs font-bold">{r.delivery_name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic pl-2">
            -- Buscando --
          </span>
        );
      },
    },
    {
      field: 'total_amount',
      headerName: 'TOTAL',
      width: 120,
      renderCell: ({ value }) => (
        <span className="font-bold text-slate-800">
          $ {Number(value).toLocaleString()}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'ACCIONES',
      width: 140,
      align: 'center',
      renderCell: ({ row }) => renderActions(row),
    },
  ];

  return (
    <CustomTable
      title={'Monitoreo de Pedidos'}
      columns={columns}
      rows={tableProps.data?.rows || []}
      getRowId={(row: any) => row.order_id || row.id}
      setActive={() => {}}
      {...tableProps}
    >
      <div className="flex flex-col sm:flex-row gap-4 w-full justify-end items-center">
        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          Desde:
          <input
            type="date"
            className="border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          Hasta:
          <input
            type="date"
            className="border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <div className="relative group w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            style={{ paddingLeft: '42px' }}
            className="block w-full pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
            placeholder="Buscar por cliente o repartidor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </CustomTable>
  );
};
