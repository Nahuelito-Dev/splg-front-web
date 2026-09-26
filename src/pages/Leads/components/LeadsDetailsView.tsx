import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserById } from '../../../services/api/users';
import Swal from 'sweetalert2';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import BadgeIcon from '@mui/icons-material/Badge';
import SecurityIcon from '@mui/icons-material/Security';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import HomeIcon from '@mui/icons-material/Home';
import { usePermisos } from '../../../hooks';

// Interfaz
interface UserDetail {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  role: { type: string };
  blocked: boolean;
  email_verified: boolean;
  customer?: { customer_id: string; lat_lang: string | null };
  delivery?: {
    calification: number;
    isActive: boolean;
    validated: boolean;
    balance: number;
  };
}

export const LeadsDetailsView = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { puedeAdministrarCuentasDeClientes } = usePermisos();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Carga de Datos
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!leadId) return;
      try {
        const data = await getUserById(leadId);
        setUser(data);
      } catch (err: any) {
        Swal.fire('Error', 'Usuario no encontrado', 'error');
        navigate('/users');
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetails();
  }, [leadId, navigate]);

  // Manejo de Bloqueo
  const handleToggleBlock = async () => {
    if (!user) return;

    // 👇 CORRECCIÓN: Comentamos o eliminamos 'action' porque no se está usando
    // const action = user.blocked ? 'desbloquear' : 'bloquear';

    /* AQUÍ IRÍA LA LÓGICA FUTURA:
    const result = await Swal.fire({ ... });
    if (result.isConfirmed) { await api.toggleBlock(user.user_id); }
    */

    console.log('Toggle block clicked (Lógica pendiente)');
  };

  if (loading)
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header de Navegación */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium"
        >
          <ArrowBackIcon fontSize="small" /> Volver al listado
        </button>

        {(!user.customer || puedeAdministrarCuentasDeClientes) && (
          <div className="flex gap-3">
            <button
              onClick={handleToggleBlock}
              className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2 ${
                user.blocked
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
              }`}
            >
              {user.blocked ? (
                <CheckCircleIcon fontSize="small" />
              ) : (
                <BlockIcon fontSize="small" />
              )}
              {user.blocked ? 'Desbloquear Cuenta' : 'Bloquear Cuenta'}
            </button>
          </div>
        )}
      </div>

      {/* Tarjeta Principal de Perfil */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-3xl font-bold text-slate-400">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="mb-1">
                <h1 className="text-2xl font-bold text-slate-800">
                  {user.full_name}
                </h1>
                <p className="text-slate-500 text-sm flex items-center gap-1">
                  ID: <span className="font-mono text-xs">{user.user_id}</span>
                </p>
              </div>
            </div>
            <div className="mb-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  user.blocked
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}
              >
                {user.blocked ? 'Bloqueado' : 'Activo'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Información de Contacto */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                Información Personal
              </h3>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500">
                  <EmailIcon />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="font-medium text-slate-700">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500">
                  <LocalPhoneIcon />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Teléfono</p>
                  <p className="font-medium text-slate-700">
                    {user.phone_number}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500">
                  <BadgeIcon />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Rol del Sistema</p>
                  <p className="font-medium text-slate-700 capitalize">
                    {user.role?.type}
                  </p>
                </div>
              </div>
            </div>

            {/* Información Específica del Rol */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                Datos de{' '}
                {user.delivery
                  ? 'Repartidor'
                  : user.customer
                    ? 'Cliente'
                    : 'Admin'}
              </h3>

              {user.delivery ? (
                <div className="bg-slate-800 text-white rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4 text-emerald-400">
                    <TwoWheelerIcon />{' '}
                    <span className="font-bold">Perfil Delivery</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Calificación</p>
                      <p className="font-bold text-xl">
                        {user.delivery.calification} ⭐
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Saldo en Cuenta</p>
                      <p className="font-bold text-xl">
                        $ {user.delivery.balance || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Validado</p>
                      <p className="font-medium">
                        {user.delivery.validated ? 'Sí' : 'Pendiente'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Estado Actual</p>
                      <p
                        className={`font-medium ${user.delivery.isActive ? 'text-emerald-400' : 'text-slate-300'}`}
                      >
                        {user.delivery.isActive ? 'Conectado' : 'Desconectado'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : user.customer ? (
                <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-4 text-indigo-600">
                    <HomeIcon />{' '}
                    <span className="font-bold">Perfil Cliente</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-indigo-400 text-xs">Cliente ID</p>
                      <p
                        className="font-mono text-slate-700 truncate"
                        title={user.customer.customer_id}
                      >
                        {user.customer.customer_id.substring(0, 12)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-indigo-400 text-xs">Ubicación</p>
                      <p className="font-bold text-slate-700">
                        {user.customer.lat_lang ?? 'S/D'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  <SecurityIcon className="mb-2 text-3xl" />
                  <p>Este usuario tiene permisos administrativos.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
