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

interface Props {
  onAssign: (order: Order) => void;
  onCancel: (order: Order) => void;
  onView: (order: Order) => void; // <--- FALTABA ESTO
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return { bg: '#fff7ed', color: '#c2410c', label: 'Pendiente' };
    case 'accepted':
      return { bg: '#eff6ff', color: '#1d4ed8', label: 'Aceptado' };
    case 'on_the_way':
      return { bg: '#f0fdf4', color: '#15803d', label: 'En Camino' };
    case 'delivered':
      return { bg: '#ecfdf5', color: '#047857', label: 'Entregado' };
    case 'cancelled':
      return { bg: '#fef2f2', color: '#be123c', label: 'Cancelado' };
    default:
      return { bg: '#f1f5f9', color: '#64748b', label: status };
  }
};

export const OrdersTable = ({ onAssign, onCancel, onView }: Props) => {
  // <--- FALTABA RECIBIR onView
  const tableProps = useTable({
    queryKey: 'orders',
    queryFn: async (page, limit) => {
      const data = await getAllOrders(page, limit);
      // Adaptamos la respuesta si el backend devuelve { orders: [], total: N }
      return { rows: data.orders, total: data.total };
    },
    dependencies: [],
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
          ...{(row.order_id || row.id).slice(-6)}
        </span>
      ),
    },
    {
      field: 'customer',
      headerName: 'CLIENTE',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }: GridRenderCellParams<Order>) => (
        <div className="flex flex-col py-1">
          <span className="font-bold text-slate-700 text-sm">
            {row.customer?.full_name || 'Anónimo'}
          </span>
          <span className="text-[10px] text-slate-400">
            {row.address?.street || 'Sin dirección'}
          </span>
        </div>
      ),
    },
    {
      field: 'status',
      headerName: 'ESTADO',
      width: 130,
      align: 'center',
      renderCell: ({ value }) => {
        const style = getStatusColor(value);
        return (
          <span
            className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            {style.label}
          </span>
        );
      },
    },
    {
      field: 'delivery',
      headerName: 'REPARTIDOR',
      flex: 1,
      renderCell: ({ row }: GridRenderCellParams<Order>) =>
        row.delivery ? (
          <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
            <LocalShippingIcon fontSize="small" />
            <span className="text-xs font-bold">
              {row.delivery.user?.full_name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic pl-2">
            -- Buscando --
          </span>
        ),
    },
    {
      field: 'totalAmount',
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
    />
  );
};
