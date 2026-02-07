import { useState } from 'react';
import { CarsTable } from './components/CarsTable';
import { CarModal } from '../Deilverys/components/CarModal'; // Reutilizamos el modal
import { updateCar, deleteCar } from '../../services/api/cars';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { Car } from '../../interfaces';

export const Cars = () => {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Mutation para Editar/Borrar
  const updateMutation = useMutation({
    mutationFn: (data: any) => updateCar(selectedCar!.car_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allCars']);
      setIsModalOpen(false);
      Swal.fire('Actualizado', 'Datos del vehículo actualizados', 'success');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      queryClient.invalidateQueries(['allCars']);
      Swal.fire('Eliminado', 'Vehículo eliminado correctamente', 'success');
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
        confirmButtonText: 'Eliminar',
      });
      if (res.isConfirmed) {
        deleteMutation.mutate(row.car_id);
      }
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Flota de Vehículos
          </h1>
          <p className="text-slate-500 mt-1">
            Vista global de todos los vehículos registrados en el sistema.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <CarsTable setAction={handleAction} />
        </section>

        {/* Solo permitimos edición aquí. La creación se hace desde el perfil del chofer */}
        <CarModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          car={selectedCar}
          onSave={(data) => updateMutation.mutate(data)}
          isSaving={updateMutation.isLoading}
        />
      </div>
    </div>
  );
};
