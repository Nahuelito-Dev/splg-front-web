import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomerById } from '../../../services/api/customers';
import { getOrdersByCustomer } from '../../../services/api/orders';

// Iconos
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HistoryIcon from '@mui/icons-material/History';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import MapIcon from '@mui/icons-material/Map';
import CircleIcon from '@mui/icons-material/Circle';

// Helper para badges de estado de orden
const getStatusBadge = (status: string) => {
  let colorClass = 'text-slate-600 bg-slate-50 border-slate-100';
  switch (status) {
    case 'pending':
      colorClass = 'text-orange-600 bg-orange-50 border-orange-100';
      break;
    case 'accepted':
      colorClass = 'text-blue-600 bg-blue-50 border-blue-100';
      break;
    case 'on_the_way':
    case 'out_for_delivery':
      colorClass = 'text-indigo-600 bg-indigo-50 border-indigo-100';
      break;
    case 'delivered':
      colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-100';
      break;
    case 'cancelled':
      colorClass = 'text-rose-600 bg-rose-50 border-rose-100';
      break;
  }

  const labels: any = {
    pending: 'Pendiente',
    accepted: 'Aceptado',
    on_the_way: 'En Camino',
    out_for_delivery: 'En Camino',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border uppercase ${colorClass}`}
    >
      <CircleIcon sx={{ fontSize: 6 }} color="inherit" />
      {labels[status] || status.replace(/_/g, ' ')}
    </span>
  );
};

export const CustomerDetails = () => {
  const { id } = useParams<{ id: string }>(); // customer_id
  const navigate = useNavigate();

  // 1. Query Cliente (Incluye Usuario y Direcciones)
  const { data: customer, isLoading: loadingCustomer, isError: errorCustomer } = useQuery(
    ['customer', id],
    () => getCustomerById(id!),
  );

  // 2. Query Historial de Pedidos
  const { data: ordersData, isLoading: loadingOrders } = useQuery(
    ['customerOrders', customer?.user_id],
    () => getOrdersByCustomer(customer!.user_id, 0, 20), // Historial real usando user_id
    {
      enabled: !!customer?.user_id, // Solo ejecutar cuando ya tenemos el user_id
    }
  );

  if (loadingCustomer)
    return (
      <div className="p-10 text-center text-slate-400">Cargando perfil...</div>
    );
  if (errorCustomer || !customer)
    return (
      <div className="p-10 text-center text-rose-500">
        Cliente no encontrado
      </div>
    );

  const user = customer.user;
  const addresses = user?.addresses || [];
  const orders = ordersData?.orders || [];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white rounded-full transition-colors text-slate-500"
        >
          <ArrowBackIcon />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Detalle del Cliente
          </h1>
          <p className="text-slate-500 text-sm">
            Información personal, ubicaciones y actividad.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA: PERFIL Y DIRECCIONES */}
        <div className="space-y-6 lg:col-span-1">
          {/* TARJETA DE PERFIL */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="px-6 pb-6 relative">
              <div className="w-20 h-20 bg-white rounded-full absolute -top-10 left-6 p-1 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-2xl font-bold text-slate-400">
                  {user?.full_name?.charAt(0) || <PersonIcon />}
                </div>
              </div>
              <br />

              <div className="mt-12">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  {user?.full_name}
                </h2>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <EmailIcon fontSize="small" className="text-slate-400" />
                    {user?.email}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <PhoneIcon fontSize="small" className="text-slate-400" />
                    {user?.phone_number}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TARJETA DE DIRECCIONES */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <LocationOnIcon className="text-rose-500" /> Direcciones Guardadas
            </h3>

            <div className="space-y-4">
              {addresses.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No tiene direcciones registradas.
                </p>
              ) : (
                addresses.map((addr: any) => (
                  <div
                    key={addr.address_id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative"
                  >
                    {addr.isDefault && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                        Principal
                      </span>
                    )}
                    <p className="font-bold text-slate-700 text-sm">
                      {addr.street}
                    </p>
                    <p className="text-xs text-slate-500">{addr.city}</p>
                    {(addr.floor || addr.apartment) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {[addr.floor ? `Piso ${addr.floor}` : null, addr.apartment ? `Depto ${addr.apartment}` : null]
                          .filter(Boolean)
                          .join(' - ')}
                      </p>
                    )}
                    {addr.additionalInstructions && (
                      <p className="text-xs text-slate-400 mt-1 italic">
                        "{addr.additionalInstructions}"
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${addr.latitude},${addr.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                      >
                        <MapIcon sx={{ fontSize: 12 }} /> Ver en Mapa
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: HISTORIAL DE PEDIDOS */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <HistoryIcon className="text-indigo-500" /> Historial de Pedidos
              </h3>
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                {ordersData?.total || 0} Total
              </span>
            </div>

            <div className="flex-1 overflow-auto p-0">
              {loadingOrders ? (
                <div className="p-10 text-center text-slate-400">
                  Cargando historial...
                </div>
              ) : orders.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <HistoryIcon className="text-slate-300" fontSize="large" />
                  </div>
                  <p className="text-slate-500">
                    Este cliente aún no ha realizado pedidos.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-3">ID Pedido</th>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3">Productos</th>
                      <th className="px-6 py-3">Total</th>
                      <th className="px-6 py-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order: any) => (
                      <tr
                        key={order.order_id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                          #{order.order_id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {order.order_items
                            ?.map(
                              (i: any) =>
                                `${i.quantity}x ${i.gas_cylinder?.type}`,
                            )
                            .join(', ')}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          $ {Number(order.total_amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(order.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
