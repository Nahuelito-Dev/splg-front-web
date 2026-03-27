import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllOrders } from '../../../services/api/orders';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CircleIcon from '@mui/icons-material/Circle';

// Helper de colores para estados (versión mini)
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
  return labels[status] || status;
};

export const RecentOrdersWidget = () => {
  // Traemos solo las últimas 5 órdenes
  const { data, isLoading } = useQuery(
    ['recentOrders'],
    () => getAllOrders(0, 5),
    {
      refetchInterval: 15000, // Actualizar cada 15 seg
    },
  );

  const orders = data?.orders || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      {/* Header Widget */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-lg">Actividad Reciente</h3>
        <Link
          to="/ordenes"
          className="text-indigo-600 text-sm font-semibold hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
        >
          Ver todo <ArrowForwardIcon fontSize="inherit" />
        </Link>
      </div>

      {/* Tabla Simplificada */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Cargando actividad...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No hay pedidos recientes.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((order: any) => (
                <tr
                  key={order.order_id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">
                    ...{order.order_id.slice(-4)}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-bold text-slate-700 text-xs truncate max-w-[120px]">
                      {order.customer_name || 'Sin nombre'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      {order.delivery_address?.street || '-'}
                    </p>
                  </td>
                  <td className="px-5 py-3 font-bold text-slate-700">
                    $ {Math.round(order.total_amount).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border uppercase ${getStatusColor(order.status)}`}
                    >
                      <CircleIcon sx={{ fontSize: 6 }} color="inherit" />
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
