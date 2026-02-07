import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDeliveryById,
  updateDelivery,
} from '../../../services/api/deliveries';
import { Delivery } from '../../../interfaces';
import { CarsManager } from './CarsManager';
import Swal from 'sweetalert2';

// Iconos
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GppBadIcon from '@mui/icons-material/GppBad';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';

export const DeliveryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para cargar/recargar datos
  const fetchDelivery = async () => {
    if (!id) return;
    try {
      const data = await getDeliveryById(id);
      setDelivery(data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar el repartidor', 'error');
      navigate('/deliveries'); // Redirigir si falla
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  // Acción rápida: Activar/Desactivar
  const handleToggleStatus = async () => {
    if (!delivery) return;
    try {
      const newStatus = !delivery.isActive;
      // Optimistic UI update
      setDelivery({ ...delivery, isActive: newStatus });

      await updateDelivery(delivery.delivery_id, { isActive: newStatus });

      const toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      toast.fire({
        icon: 'success',
        title: newStatus ? 'Repartidor Activado' : 'Repartidor Pausado',
      });
    } catch (e) {
      fetchDelivery(); // Revertir si falla
      Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  if (!delivery) return null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header de Navegación */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold"
        >
          <ArrowBackIcon fontSize="small" /> Volver a la flota
        </button>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              delivery.validated
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {delivery.validated ? (
              <VerifiedUserIcon fontSize="small" />
            ) : (
              <GppBadIcon fontSize="small" />
            )}
            {delivery.validated
              ? 'Documentación Validada'
              : 'Validación Pendiente'}
          </span>

          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all border ${
              delivery.isActive
                ? 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700'
            }`}
          >
            {delivery.isActive ? 'Desactivar Cuenta' : 'Activar Cuenta'}
          </button>
        </div>
      </div>

      {/* --- TARJETA DE PERFIL --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner Decorativo */}
        <div className="h-28 bg-gradient-to-r from-indigo-600 to-blue-500"></div>

        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-10 mb-6">
            <div className="flex items-end gap-4">
              {/* Avatar / Selfie */}
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                {/* Si tuvieras foto real usarías <img src={delivery.user.selfie} ... /> */}
                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-4xl font-bold text-indigo-300">
                  {delivery.user?.full_name?.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="mb-1">
                <h1 className="text-2xl font-extrabold text-slate-800">
                  {delivery.user?.full_name}
                </h1>
                <p className="text-slate-500 flex items-center gap-2 text-sm">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">
                    {delivery.user?.email}
                  </span>
                  •<span>{delivery.user?.phone_number}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Métricas del Repartidor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Balance */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-full shadow-sm text-emerald-500">
                <AccountBalanceWalletIcon fontSize="large" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Balance en Cuenta
                </p>
                <p
                  className={`text-2xl font-black ${delivery.balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}
                >
                  $ {Number(delivery.balance).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Calificación */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-full shadow-sm text-amber-400">
                <StarIcon fontSize="large" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Calificación
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-slate-800">
                    {Number(delivery.calification || 5).toFixed(1)}
                  </p>
                  <div className="flex text-amber-400 text-xs">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        fontSize="inherit"
                        className={
                          star <= (delivery.calification || 5)
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Estado Viaje (Placeholder) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-full shadow-sm text-blue-500">
                <TwoWheelerIcon fontSize="large" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Estado Actual
                </p>
                <p className="text-lg font-bold text-slate-700">
                  {/* Aquí podrías conectar 'isTraveling' del backend */}
                  Disponible
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- GESTOR DE VEHÍCULOS --- */}
      {/* Pasamos user_id porque los autos se asocian al usuario, no al delivery_id directamente */}
      <CarsManager userId={delivery.user_id} />
    </div>
  );
};
