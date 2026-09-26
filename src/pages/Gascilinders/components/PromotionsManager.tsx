import {
  Control,
  useFieldArray,
  UseFormRegister,
  useWatch,
} from 'react-hook-form';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

interface Props {
  control: Control<any>;
  register: UseFormRegister<any>;
  currentPrice: number; // Para calcular el precio con descuento en vivo
}

export const PromotionsManager = ({
  control,
  register,
  currentPrice,
}: Props) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'promotions',
  });

  // Observamos los valores del array para hacer cálculos en tiempo real
  const promotionsValues = useWatch({
    control,
    name: 'promotions',
  });

  const calculateDiscountedPrice = (percentage: any) => {
    if (!currentPrice || !percentage) return 0;
    const desc = (currentPrice * Number(percentage)) / 100;
    return currentPrice - desc;
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      {/* Header del Sub-componente */}
      <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <LocalOfferIcon className="text-pink-500" fontSize="small" />
          Reglas de Descuento
        </h4>
        <button
          type="button"
          onClick={() => append({ quantity: '', discountPercentage: '' })}
          className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
        >
          <AddCircleOutlineIcon style={{ fontSize: 16 }} /> Agregar Regla
        </button>
      </div>

      {/* Cuerpo de la lista */}
      <div className="p-4 space-y-3">
        {fields.length === 0 && (
          <div className="text-center py-4 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-xs italic">No hay promociones configuradas.</p>
            <p className="text-[10px] mt-1">
              Ej: "Llevando 3, obtienes 10% off"
            </p>
          </div>
        )}

        {fields.map((field, index) => {
          // Obtenemos el valor actual de este campo específico para el preview
          const currentPromo = promotionsValues?.[index];
          const finalPrice = calculateDiscountedPrice(
            currentPromo?.discountPercentage,
          );

          return (
            <div
              key={field.id}
              className="flex items-start gap-3 animate-fadeIn group"
            >
              {/* Cantidad */}
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                  Cant. Mínima
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="3"
                    {...register(`promotions.${index}.quantity` as const, {
                      required: true,
                      min: 2,
                    })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">
                    u.
                  </span>
                </div>
              </div>

              {/* Porcentaje */}
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                  Descuento
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="10"
                    {...register(
                      `promotions.${index}.discountPercentage` as const,
                      { required: true, min: 0.01, max: 100 },
                    )}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              {/* Preview de Precio (UX) */}
              <div className="flex-1 hidden sm:block">
                <label className="text-[10px] font-bold text-emerald-600 uppercase ml-1">
                  Queda en:
                </label>
                <div className="flex items-center gap-2 h-[38px] px-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <span className="text-xs text-emerald-400 line-through">
                    ${currentPrice || 0}
                  </span>
                  <ArrowRightAltIcon
                    className="text-emerald-300"
                    fontSize="small"
                  />
                  <span className="text-sm font-bold text-emerald-700">
                    ${finalPrice > 0 ? finalPrice.toLocaleString() : '-'}
                  </span>
                </div>
              </div>

              {/* Botón Borrar */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Eliminar regla"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
