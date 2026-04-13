import { useState } from 'react';
import { CarsTable } from './components/CarsTable';
import { CarModal } from '../Deilverys/components/CarModal';
import { createCar, updateCar, deleteCar } from '../../services/api/cars';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { Car } from '../../interfaces';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

export const Cars = () => {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data };
      if (!payload.user_id || payload.user_id === '') {
        delete payload.user_id;
      }
      
      if (selectedCar) {
        return updateCar(selectedCar.car_id, payload);
      }
      return createCar(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCars']);
      setIsModalOpen(false);
      Swal.fire({
        title: selectedCar ? 'Actualizado' : 'Creado',
        text: selectedCar ? 'Datos del vehículo actualizados' : 'Vehículo registrado correctamente',
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

  const deleteMutation = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      queryClient.invalidateQueries(['allCars']);
      Swal.fire({
        title: 'Eliminado',
        text: 'Vehículo eliminado correctamente',
        icon: 'success',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: 'bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors'
        },
        buttonsStyling: false
      });
    },
  });

  const handleAction = async (event: any) => {
    const { row, field } = event;

    if (field === 'edit') {
      setSelectedCar(row);
      setIsModalOpen(true);
    }

    if (field === 'delete') {
      const res = await Swal.fire({
        title: '¿Eliminar Vehículo?',
        text: `Se eliminará el ${row.car_brand} ${row.car_model} (${row.car_patent})`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-rose-500 text-white px-5 py-2 rounded-lg',
          cancelButton: 'bg-slate-200 text-slate-600 px-5 py-2 rounded-lg'
        },
        buttonsStyling: false
      });
      if (res.isConfirmed) {
        deleteMutation.mutate(row.car_id);
      }
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Flota de Vehículos
            </h1>
            <p className="text-slate-500 mt-1">
              Vista global de todos los vehículos registrados en el sistema.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCar(null);
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <DirectionsCarIcon />
            Nuevo Vehículo
          </button>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <CarsTable setAction={handleAction} />
        </section>

        <CarModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          car={selectedCar}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isLoading}
        />
      </div>
    </div>
  );
};
