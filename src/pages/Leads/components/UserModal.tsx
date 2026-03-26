import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  user?: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}

export const UserModal = ({
  user,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const isEditing = !!user;

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          full_name: user.full_name,
          phone_number: user.phone_number,
          email: user.email,
          blocked: user.blocked,
        });
      } else {
        reset({
          full_name: '',
          phone_number: '',
          email: '',
          password: '',
          blocked: false,
        });
      }
    }
  }, [user, isOpen, reset]);

  const onSubmit = (data: any) => {
    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fadeIn">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          <button onClick={onClose}>
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Nombre Completo
              </label>
              <input
                {...register('full_name', { required: 'Requerido' })}
                className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.full_name && (
                <span className="text-xs text-red-500">Requerido</span>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Teléfono
              </label>
              <input
                {...register('phone_number', { required: 'Requerido' })}
                className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.phone_number && (
                <span className="text-xs text-red-500">Requerido</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Email
            </label>
            <input
              type="email"
              {...register('email', { required: 'Requerido' })}
              disabled={isEditing}
              className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            {errors.email && (
              <span className="text-xs text-red-500">Requerido</span>
            )}
            {isEditing && (
              <p className="text-xs text-slate-400 mt-1">El email no se puede modificar por temas de autenticación.</p>
            )}
          </div>

          {!isEditing && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Contraseña
              </label>
              <input
                type="password"
                {...register('password', {
                  required: 'Requerido',
                  minLength: 6,
                })}
                className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Mínimo 6 caracteres"
              />
              {errors.password && (
                <span className="text-xs text-red-500">Mínimo 6 caracteres</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 border p-3 rounded-lg bg-rose-50/50 border-rose-100">
              <input
                type="checkbox"
                {...register('blocked')}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <span className="text-sm font-semibold text-rose-700">Bloquear Usuario</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg disabled:opacity-70"
            >
              {isSaving
                ? 'Guardando...'
                : isEditing
                  ? 'Actualizar Datos'
                  : 'Registrar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
