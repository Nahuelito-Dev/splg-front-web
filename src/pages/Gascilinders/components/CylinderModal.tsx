import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { GasCylinder } from '../../../interfaces';
import CloseIcon from '@mui/icons-material/Close';
import { PromotionsManager } from './PromotionsManager';

interface Props {
  cylinder?: GasCylinder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}

interface FormInputs {
  type: string;
  weight: number | string;
  price: number | string;
  stock: number | string;
  description: string;
  promotions: {
    quantity: number | string;
    discountPercentage: number | string;
  }[];
}

export const CylinderModal = ({
  cylinder,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormInputs>({
    defaultValues: { promotions: [] },
  });

  const currentPrice = useWatch({ control, name: 'price' });

  useEffect(() => {
    if (isOpen) {
      if (cylinder) {
        reset({
          type: cylinder.type,
          weight: cylinder.weight,
          price: cylinder.price,
          stock: cylinder.stock,
          description: cylinder.description || '',
          promotions: cylinder.promotions || [],
        });
      } else {
        reset({
          type: '',
          weight: '',
          price: '',
          stock: 0,
          description: '',
          promotions: [],
        });
      }
    }
  }, [cylinder, reset, isOpen]);

  const handleFormSubmit = (data: FormInputs) => {
    onSave({
      ...data,
      weight: Number(data.weight),
      price: Number(data.price),
      stock: Number(data.stock),
      promotions:
        data.promotions?.map((p) => ({
          quantity: Number(p.quantity),
          discountPercentage: Number(p.discountPercentage),
        })) || [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 my-6 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-800">
            {cylinder ? 'Editar Producto' : 'Nueva Garrafa'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Formulario Scrollable */}
        <div className="overflow-y-auto p-6">
          <form
            id="cylinder-form"
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Tipo
                  </label>
                  <input
                    {...register('type', { required: 'Requerido' })}
                    placeholder="Ej: 10kg"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                  {errors.type && (
                    <span className="text-xs text-rose-500">Requerido</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    {...register('price', { required: true, min: 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Peso (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('weight', { required: true })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Stock (Inventario Real)
                  </label>
                  <input
                    type="number"
                    {...register('stock')}
                    // SE ELIMINÓ EL DISABLED AQUÍ
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Este valor reemplazará el stock actual.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Descripción
              </label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none"
              />
            </div>

            <PromotionsManager
              control={control}
              register={register}
              currentPrice={Number(currentPrice)}
            />
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            form="cylinder-form"
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-lg shadow-lg shadow-pink-200 disabled:opacity-70 flex items-center gap-2"
          >
            {isSaving ? 'Guardando...' : 'Guardar Producto'}
          </button>
        </div>
      </div>
    </div>
  );
};
