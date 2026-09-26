import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import CloseIcon from '@mui/icons-material/Close';
import { RegisterAdminPayload } from '../../../services/api/admins';
import { getAllDistributors } from '../../../services/api/distributors';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: RegisterAdminPayload) => void;
  isSaving: boolean;
  /** super_admin puede elegir empresa y crear cualquier rol; el admin de empresa no. */
  isSuperAdmin: boolean;
}

export const CreateAdminModal = ({
  isOpen,
  onClose,
  onCreate,
  isSaving,
  isSuperAdmin,
}: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterAdminPayload>();

  const { data: distributors } = useQuery(
    ['distributors'],
    getAllDistributors,
    { enabled: isOpen && isSuperAdmin },
  );

  // Un admin sólo puede ser admin o super admin, y un admin de empresa no
  // puede crear super admins (el backend lo rechaza igual).
  const availableRoles: RegisterAdminPayload['rol'][] = isSuperAdmin
    ? ['admin', 'super_admin']
    : ['admin'];

  useEffect(() => {
    if (isOpen) reset({});
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: RegisterAdminPayload) => {
    onCreate({ ...data, distributorId: data.distributorId || undefined });
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Nuevo admin</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-4 overflow-y-auto"
        >
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nombre completo <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('full_name', { required: 'Requerido' })}
              className={inputCls}
              placeholder="Ej: Juana Pérez"
            />
            {errors.full_name && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              {...register('email', { required: 'Requerido' })}
              className={inputCls}
              placeholder="admin@empresa.com"
            />
            {errors.email && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Teléfono <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('phone_number', { required: 'Requerido' })}
              className={inputCls}
              placeholder="+54 9 376 4123456"
            />
            {errors.phone_number && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.phone_number.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Contraseña <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('password', {
                required: 'Requerido',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
              className={inputCls}
              placeholder="Mínimo 6 caracteres"
            />
            {errors.password && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Rol <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('rol', { required: 'Requerido' })}
              className={`${inputCls} bg-white`}
            >
              <option value="">— Elegir rol —</option>
              {availableRoles.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
            {errors.rol && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.rol.message}
              </p>
            )}
          </div>

          {isSuperAdmin ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Empresa (distribuidora)
              </label>
              <select
                {...register('distributorId')}
                className={`${inputCls} bg-white`}
              >
                <option value="">— Sin empresa (cross-tenant) —</option>
                {(distributors ?? []).map((d: any) => (
                  <option key={d.distributor_id} value={d.distributor_id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Dejar vacío solo para admins de plataforma (super_admin).
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              El admin se crea en tu misma empresa.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-slate-600 font-medium hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {isSaving ? 'Creando...' : 'Crear admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
