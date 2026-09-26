import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddIcon from '@mui/icons-material/Add';
import { getAdmins, registerAdmin } from '../../services/api/admins';
import { CreateAdminModal } from './components/CreateAdminModal';
import { useAppSelector } from '../../hooks';

export const Admins = () => {
  const queryClient = useQueryClient();
  const { role } = useAppSelector((state) => state.auth);
  const isSuperAdmin = role === 'super_admin';
  const [createOpen, setCreateOpen] = useState(false);

  const { data: admins = [], isLoading } = useQuery(['admins'], getAdmins);

  const createMutation = useMutation({
    mutationFn: registerAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries(['admins']);
      setCreateOpen(false);
      Swal.fire({
        title: 'Admin creado',
        text: 'El administrador fue dado de alta correctamente.',
        icon: 'success',
        customClass: {
          confirmButton:
            'bg-indigo-600 text-white font-bold px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors',
        },
        buttonsStyling: false,
      });
    },
    onError: (e: any) => {
      let msg = e?.response?.data?.message || 'No se pudo crear el admin.';
      if (Array.isArray(msg)) msg = msg.join(', ');
      if (typeof msg === 'string' && msg.toLowerCase().includes('exist'))
        msg = 'El email o teléfono ya está registrado.';
      Swal.fire({
        title: 'Error',
        text: msg,
        icon: 'error',
        customClass: {
          confirmButton:
            'bg-rose-600 text-white font-bold px-6 py-2 rounded-md hover:bg-rose-700 transition-colors',
        },
        buttonsStyling: false,
      });
    },
  });

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <AdminPanelSettingsIcon
                fontSize="large"
                className="text-slate-400"
              />
              Administradores
            </h1>
            <p className="text-slate-500 mt-1 ml-11">
              Gestión de admins por empresa (distribuidora).
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <AddIcon fontSize="small" /> Nuevo admin
          </button>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">
              Cargando administradores...
            </div>
          ) : admins.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AdminPanelSettingsIcon
                  className="text-slate-300"
                  fontSize="large"
                />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Sin admins</h3>
              <p className="text-slate-500">
                Todavía no hay administradores en esta vista.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Nombre</th>
                    <th className="px-6 py-3 font-semibold">Email</th>
                    <th className="px-6 py-3 font-semibold">Teléfono</th>
                    <th className="px-6 py-3 font-semibold">Rol</th>
                    <th className="px-6 py-3 font-semibold">Empresa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.map((a) => (
                    <tr key={a.admin_id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-800">
                        {a.user?.full_name ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {a.user?.email ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {a.user?.phone_number ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold border uppercase text-indigo-600 bg-indigo-50 border-indigo-100">
                          {a.role?.type ?? a.user?.role?.type ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {a.distributor?.name ?? (
                          <span className="text-slate-400 italic">
                            Plataforma
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <CreateAdminModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(payload) => createMutation.mutate(payload)}
        isSaving={createMutation.isLoading}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
};
