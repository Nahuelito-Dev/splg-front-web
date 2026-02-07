import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Delivery } from '../../../interfaces';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  delivery?: Delivery | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}

export const DeliveryModal = ({
  delivery,
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

  // Detectamos si estamos editando
  const isEditing = !!delivery;

  useEffect(() => {
    if (isOpen) {
      if (delivery) {
        // Modo Edición: Cargamos datos
        reset({
          full_name: delivery.user?.full_name,
          phone_number: delivery.user?.phone_number,
          email: delivery.user?.email,
          isActive: delivery.isActive,
          validated: delivery.validated,
          // No cargamos password en edición
        });
      } else {
        // Modo Creación: Reset limpio
        reset({
          full_name: '',
          phone_number: '',
          email: '',
          password: '', // Solo requerido al crear
          isActive: true,
          validated: true,
        });
      }
    }
  }, [delivery, isOpen, reset]);

  const onSubmit = (data: any) => {
    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fadeIn">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {isEditing ? 'Editar Repartidor' : 'Registrar Nuevo Repartidor'}
          </h3>
          <button onClick={onClose}>
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Datos Personales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Nombre Completo
              </label>
              <input
                {...register('full_name', { required: 'Requerido' })}
                disabled={isEditing} // Bloqueamos nombre en edición por ahora (requiere otro endpoint)
                className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
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
                disabled={isEditing}
                className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">
              Email (Login)
            </label>
            <input
              type="email"
              {...register('email', { required: 'Requerido' })}
              disabled={isEditing} // El email no se edita fácil (es ID de Firebase)
              className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            />
          </div>

          {/* Password solo si es CREACIÓN */}
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
                <span className="text-xs text-red-500">
                  Mínimo 6 caracteres
                </span>
              )}
            </div>
          )}

          {/* Configuración Operativa (Siempre visible) */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 border p-3 rounded-lg">
              <input
                type="checkbox"
                {...register('isActive')}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-slate-700">Cuenta Activa</span>
            </div>
            <div className="flex items-center gap-2 border p-3 rounded-lg">
              <input
                type="checkbox"
                {...register('validated')}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-slate-700">
                Validado (Documentos)
              </span>
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
                  : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
