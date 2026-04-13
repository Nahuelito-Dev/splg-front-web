import { Order } from '../../../services/api/orders';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReceiptIcon from '@mui/icons-material/Receipt';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const getStatusBadge = (status: string) => {
  const styles: any = {
    pending: 'bg-orange-100 text-orange-700',
    accepted: 'bg-blue-100 text-blue-700',
    out_for_delivery: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
  };
  const labels: any = {
    pending: 'PENDIENTE',
    accepted: 'ACEPTADO',
    out_for_delivery: 'EN CAMINO',
    delivered: 'ENTREGADO',
    cancelled: 'CANCELADO',
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${styles[status] || 'bg-gray-100'}`}
    >
      {labels[status] || status}
    </span>
  );
};

const formatDateTime = (date?: string | Date | null) => {
  if (!date) return '-- --';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-- --';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

export const OrderDetailsModal = ({ isOpen, onClose, order }: Props) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500">
              <ReceiptIcon />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Pedido #{((order as any).order_id || '000000').slice(-6).toUpperCase()}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <AccessTimeIcon fontSize="inherit" />{' '}
                {formatDateTime((order as any).createdAt || (order as any).created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(order.status)}
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors"
            >
              <CloseIcon className="text-slate-400 hover:text-slate-600" />
            </button>
          </div>
        </div>

      {/* BODY (Scrollable) */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 space-y-6">
          {/* 1. INFO CLIENTE Y ENTREGA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                <PersonIcon fontSize="small" /> Cliente
              </h4>
              <div className="space-y-2">
                <p className="font-bold text-slate-800 text-lg">
                  {(order as any).customer_name || 'Consumidor Final'}
                </p>
                <p className="text-sm text-slate-600">
                  {(order as any).customer_phone || '-'}
                </p>
                <p className="text-sm text-slate-500">{(order as any).customer_email || '-'}</p>
              </div>
            </div>

            {/* Dirección */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                <LocationOnIcon fontSize="small" /> Entrega
              </h4>
              <div className="space-y-2">
                <p className="font-medium text-slate-800">
                  {(order as any).delivery_address?.street || 'Sin Dirección'}
                </p>
                <p className="text-xs text-slate-500 bg-slate-100 p-2 rounded border border-slate-200">
                  {(order as any).delivery_address?.formatted_address ||
                    'Sin dirección formateada'}
                </p>
                {/* Aquí podrías poner un link a Google Maps */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((order as any).delivery_address?.formatted_address || (order as any).delivery_address?.street || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline font-bold block mt-1"
                >
                  Ver en Google Maps
                </a>
              </div>
            </div>
          </div>

          {/* 2. TIMINGS DEL PEDIDO */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
              Tiempos del pedido
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
              <div>
                <p className="text-xs text-slate-400">Aceptado</p>
                <p className="font-semibold">
                  {formatDateTime((order as any).acceptedAt || (order as any).accepted_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Comienzo del viaje</p>
                <p className="font-semibold">
                  {formatDateTime(
                    (order as any).onTheWayAt || (order as any).on_the_way_at,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Entregado</p>
                <p className="font-semibold">
                  {formatDateTime(
                    (order as any).actualDeliveryDate ||
                      (order as any).actual_delivery_date ||
                      (order as any).deliveredAt ||
                      (order as any).delivered_at,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Última actualización</p>
                <p className="font-semibold">
                  {formatDateTime((order as any).updatedAt || (order as any).updated_at)}
                </p>
              </div>
            </div>
            {order.status === 'cancelled' && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                <p className="text-xs text-rose-500 font-semibold uppercase">
                  Motivo de cancelación
                </p>
                <p className="text-sm text-rose-700">
                  {(order as any).cancellationReason || (order as any).cancellation_reason || 'No informado'}
                </p>
              </div>
            )}
          </div>

          {/* 2. REPARTIDOR ASIGNADO */}
          {(order as any).delivery_name && (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white text-indigo-600 rounded-full shadow-sm">
                  <LocalShippingIcon />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-800 uppercase">
                    Repartidor Asignado
                  </p>
                  <p className="font-bold text-slate-800">
                    {(order as any).delivery_name}
                  </p>
                  <p className="text-xs text-indigo-600 font-medium">
                    {(order as any).delivery_phone || '-'}
                  </p>
                </div>
              </div>
              {/* Aquí podrías poner botón para llamar o desasignar */}
            </div>
          )}

          {/* 3. DETALLE DE PRODUCTOS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-center">Cant.</th>
                  <th className="px-4 py-3 text-right">Precio Unit.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {((order as any).order_items || []).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {item.gas_cylinder?.type || 'Producto Desconocido'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      $ {Number(item.gas_cylinder?.price || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      ${' '}
                      {(
                        Number(item.gas_cylinder?.price || 0) * item.quantity
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right font-bold text-slate-600"
                  >
                    Total a Pagar
                  </td>
                  <td className="px-4 py-3 text-right font-black text-xl text-slate-800 flex items-center justify-end gap-1">
                    <AttachMoneyIcon
                      fontSize="small"
                      className="text-emerald-500"
                    />
                    {Number((order as any).total_amount).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 pb-3 text-right text-xs text-slate-400 uppercase font-bold"
                  >
                    Método:{' '}
                    {(order as any).payment_method === 'cash'
                      ? 'Efectivo'
                      : 'MercadoPago'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-white p-4 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
