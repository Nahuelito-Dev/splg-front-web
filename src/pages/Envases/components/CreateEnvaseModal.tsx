import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import CloseIcon from '@mui/icons-material/Close';
import { getAllCylinders } from '../../../services/api/cylinders';

interface FormValues {
  serial: string;
  deposit: number;
  gasCylinderId: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    serial: string;
    deposit?: number;
    gasCylinderId?: string;
  }) => void;
  isSaving: boolean;
}

export const CreateEnvaseModal = ({
  isOpen,
  onClose,
  onCreate,
  isSaving,
}: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { serial: '', deposit: 0, gasCylinderId: '' },
  });

  // Catálogo de TIPOS de producto para asociar el envase (opcional).
  const { data: catalog } = useQuery(
    ['gascylinder-catalog'],
    () => getAllCylinders(0, 100),
    { enabled: isOpen },
  );

  useEffect(() => {
    if (isOpen) reset({ serial: '', deposit: 0, gasCylinderId: '' });
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: FormValues) => {
    onCreate({
      serial: data.serial.trim(),
      deposit: Number(data.deposit) || 0,
      gasCylinderId: data.gasCylinderId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Nuevo envase</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Número de serie <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('serial', {
                required: 'El serial es obligatorio.',
              })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: SN-000123"
            />
            {errors.serial && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.serial.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Tipo de producto (opcional)
            </label>
            <select
              {...register('gasCylinderId')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Sin asociar —</option>
              {(catalog?.rows ?? []).map((c: any) => (
                <option key={c.gas_cylinder_id} value={c.gas_cylinder_id}>
                  {c.type ?? c.name ?? c.gas_cylinder_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Garantía / depósito
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              {...register('deposit', { min: 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

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
              {isSaving ? 'Creando...' : 'Crear envase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
