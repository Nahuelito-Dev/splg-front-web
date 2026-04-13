import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Car } from '../../../interfaces';
import { getAllDeliveries } from '../../../services/api/deliveries';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  car?: Car | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}

export const CarModal = ({ car, isOpen, onClose, onSave, isSaving }: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const isEditing = !!car;

  useEffect(() => {
    if (isOpen) {
      if (car) {
        // Cargar datos para editar
        reset({
          car_brand: car.car_brand,
          car_model: car.car_model,
          car_patent: car.car_patent,
          type_car: car.type_car,
          car_year: car.car_year,
          car_color: car.car_color,
          car_capacity: car.car_capacity,
          user_id: car.user_id,
        });
      } else {
        // Limpiar para crear
        reset({
          car_brand: '',
          car_model: '',
          car_patent: '',
          type_car: 'Moto',
          car_year: new Date().getFullYear(),
          car_color: '',
          car_capacity: '',
          user_id: '',
        });
      }
    }
  }, [isOpen, car, reset]);

  const { data: deliveries } = useQuery(['deliveriesForCarAssign'], () => getAllDeliveries(0, 100));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fadeIn overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {isEditing ? 'Editar Vehículo' : 'Agregar Nuevo Vehículo'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-4">
          {/* Fila 1: Marca y Modelo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Marca
              </label>
              <input
                {...register('car_brand', { required: 'Requerido' })}
                placeholder="Ej: Honda"
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.car_brand && (
                <span className="text-xs text-rose-500">Requerido</span>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Modelo
              </label>
              <input
                {...register('car_model', { required: 'Requerido' })}
                placeholder="Ej: Titan 150"
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Fila 2: Patente y Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Patente
              </label>
              <input
                {...register('car_patent', { required: 'Requerido' })}
                placeholder="AA123BB"
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Tipo de Vehículo
              </label>
              <select
                {...register('type_car', { required: true })}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Moto">Moto</option>
                <option value="Auto">Auto</option>
                <option value="Camioneta">Camioneta</option>
                <option value="Camion">Camión</option>
              </select>
            </div>
          </div>

          {/* Fila 3: Detalles (Color, Año, Capacidad) */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Año
              </label>
              <input
                type="number"
                {...register('car_year', { valueAsNumber: true })}
                placeholder="2023"
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Color
              </label>
              <input
                {...register('car_color')}
                placeholder="Rojo"
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Carga (kg)
              </label>
              <input
                type="number"
                {...register('car_capacity', { valueAsNumber: true })}
                placeholder="500"
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Asignado a: (Chofer)
              </label>
              <select
                {...register('user_id', { required: true })}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seleccione un repartidor</option>
                {deliveries?.rows?.map((dev: any) => (
                  <option key={dev.user_id} value={dev.user_id}>
                    {dev.user?.full_name || 'Sin Nombre'} ({dev.user?.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-70"
            >
              {isSaving
                ? 'Guardando...'
                : isEditing
                  ? 'Actualizar Vehículo'
                  : 'Guardar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
