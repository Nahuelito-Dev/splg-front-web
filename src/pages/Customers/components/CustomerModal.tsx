import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Customer } from '../../../interfaces';
import CloseIcon from '@mui/icons-material/Close';
import LockResetIcon from '@mui/icons-material/LockReset';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface Props {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}

export const CustomerModal = ({
  customer,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const isEditing = !!customer;

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const newPassword = watch('newPassword');

  useEffect(() => {
    if (isOpen) {
      setShowPasswordReset(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setShowCreatePassword(false);
      if (customer) {
        reset({
          full_name: customer.user?.full_name,
          phone_number: customer.user?.phone_number,
          email: customer.user?.email,
          validated: customer.validated === 'true',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        reset({
          full_name: '',
          phone_number: '',
          email: '',
          password: '',
          validated: false,
        });
      }
    }
  }, [customer, isOpen, reset]);

  const onSubmit = (data: any) => {
    const payload: any = {
      ...data,
      validated: data.validated ? 'true' : 'false',
    };

    if (isEditing && data.newPassword) {
      payload.newPassword = data.newPassword;
    }

    delete payload.confirmPassword;
    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fadeIn">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
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
                disabled={isEditing}
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
              disabled={isEditing}
              className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showCreatePassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Requerido',
                    minLength: 6,
                  })}
                  className="w-full mt-1 p-2 pr-10 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  {showCreatePassword ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-red-500">
                  Mínimo 6 caracteres
                </span>
              )}
            </div>
          )}

          <div className="pt-2">
            <div className="flex items-center gap-2 border p-3 rounded-lg w-fit">
              <input
                type="checkbox"
                {...register('validated')}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-slate-700 font-medium">Validado (Documentación)</span>
            </div>
          </div>

          {isEditing && (
            <div className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50/30">
              <button
                type="button"
                onClick={() => setShowPasswordReset(!showPasswordReset)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LockResetIcon fontSize="small" />
                  Restaurar Contraseña
                </span>
                {showPasswordReset ? (
                  <KeyboardArrowUpIcon fontSize="small" />
                ) : (
                  <KeyboardArrowDownIcon fontSize="small" />
                )}
              </button>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  showPasswordReset ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4 space-y-3 border-t border-amber-200">
                  <div className="mt-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        {...register('newPassword', {
                          minLength: {
                            value: 6,
                            message: 'Mínimo 6 caracteres',
                          },
                        })}
                        className="w-full mt-1 p-2 pr-10 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        {showNewPassword ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <span className="text-xs text-red-500">
                        {(errors.newPassword as any)?.message}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Confirmar Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...register('confirmPassword', {
                          validate: (value: string) => {
                            if (newPassword && !value) return 'Confirma la contraseña';
                            if (value !== newPassword) return 'Las contraseñas no coinciden';
                            return true;
                          },
                        })}
                        className="w-full mt-1 p-2 pr-10 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Repite la contraseña"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <span className="text-xs text-red-500">
                        {(errors.confirmPassword as any)?.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
