import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  getAllTimeSlots,
  createTimeSlot,
  deleteTimeSlot,
  TimeSlot,
} from '../../../services/api/timeslots';
import Swal from 'sweetalert2';

// Iconos
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

export const TimeSlotsManager = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  // React Hook Form
  const { register, handleSubmit, reset } = useForm(); // Eliminado 'formState: { errors }' porque no se usa

  // 1. Cargar Franjas
  const { data: slots = [], isLoading } = useQuery(
    ['timeslots'],
    getAllTimeSlots,
  );

  // 2. Crear Franja
  const createMutation = useMutation({
    mutationFn: createTimeSlot,
    onSuccess: () => {
      queryClient.invalidateQueries(['timeslots']);
      setIsAdding(false);
      reset();
      Swal.fire({
        icon: 'success',
        title: 'Franja Creada',
        text: 'El horario ya está disponible para los clientes.',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-2xl shadow-xl'
        }
      });
    },
    onError: () => {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo crear la franja. Revisa los datos.',
        icon: 'error',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
        },
        buttonsStyling: false
      });
    },
  });

  // 3. Desactivar Franja
  const deleteMutation = useMutation({
    mutationFn: deleteTimeSlot,
    onSuccess: () => {
      queryClient.invalidateQueries(['timeslots']);
      Swal.fire({
        title: 'Desactivado',
        text: 'La franja ha sido retirada del listado.',
        icon: 'success',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
        },
        buttonsStyling: false
      });
    },
  });

  const onSubmit = (data: any) => {
    // Convertimos capacity a número por si acaso
    createMutation.mutate({ ...data, capacity: Number(data.capacity) });
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: '¿Desactivar horario?',
      text: 'Los clientes ya no podrán elegir esta franja.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'rounded-2xl shadow-xl',
        confirmButton: 'bg-rose-500 text-white px-5 py-2 rounded-lg',
        cancelButton: 'bg-slate-200 text-slate-600 px-5 py-2 rounded-lg'
      },
      buttonsStyling: false
    });

    if (res.isConfirmed) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AccessTimeIcon className="text-indigo-500" /> Turnos de Entrega
          </h3>
          <p className="text-sm text-slate-500">
            Configura los horarios disponibles para pedidos.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-md flex items-center gap-2"
          >
            <AddCircleOutlineIcon fontSize="small" /> Nueva Franja
          </button>
        )}
      </div>

      {/* Formulario de Creación */}
      {isAdding && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-indigo-50 p-5 rounded-xl mb-6 border border-indigo-100 animate-fadeIn"
        >
          <h4 className="text-xs font-bold text-indigo-800 uppercase mb-3">
            Datos del Turno
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-500 font-bold mb-1">
                Nombre
              </label>
              <input
                {...register('name', { required: true })}
                placeholder="Ej: Mañana"
                className="w-full p-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold mb-1">
                Inicio (HH:MM)
              </label>
              <input
                type="time"
                {...register('startTime', { required: true })}
                className="w-full p-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold mb-1">
                Fin (HH:MM)
              </label>
              <input
                type="time"
                {...register('endTime', { required: true })}
                className="w-full p-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold mb-1">
                Cupo Máximo
              </label>
              <input
                type="number"
                {...register('capacity', { required: true, min: 1 })}
                defaultValue={50}
                className="w-full p-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-indigo-200">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md"
            >
              Guardar Turno
            </button>
          </div>
        </form>
      )}

      {/* Lista de Franjas */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400">
            Cargando horarios...
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AccessTimeIcon className="text-slate-300 text-4xl mb-2" />
            <p className="text-slate-500 font-medium">
              No hay horarios activos.
            </p>
            <p className="text-xs text-slate-400">
              Agrega uno para que los clientes puedan pedir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slots.map((slot: TimeSlot) => (
              <div
                key={slot.time_slot_id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all bg-white group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                    <AccessTimeIcon />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{slot.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {slot.startTime?.slice(0, 5)} -{' '}
                        {slot.endTime?.slice(0, 5)}
                      </span>
                      <span>• Cupo: {slot.capacity}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(slot.time_slot_id)}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="Desactivar horario"
                >
                  <DeleteOutlineIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
