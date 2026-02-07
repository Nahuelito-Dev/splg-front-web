import { useState } from 'react';
import { DeliveriesTable } from './components/DeliveriesTable';
import { DeliveryModal } from './components/DeliveryModal';
import {
  createDelivery,
  updateDelivery,
  deleteDelivery,
} from '../../services/api/deliveries';
import { useCRUDModal } from '../../hooks';
import Swal from 'sweetalert2';
import { Delivery } from '../../interfaces';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export const Deliveries = () => {
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { deleteMutation } = useCRUDModal({
    deleteFn: deleteDelivery,
    queryKey: 'deliveries',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedDelivery) {
        // UPDATE (Solo enviamos lo editable del Delivery entity)
        return await updateDelivery(selectedDelivery.delivery_id, {
          isActive: data.isActive,
          validated: data.validated,
          // Si necesitas editar user, harías otra llamada aquí a users.update
        });
      }
      // CREATE (Llama al endpoint complex de Users)
      return await createDelivery(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['deliveries']);
      setIsModalOpen(false);
      Swal.fire('Éxito', 'Repartidor guardado correctamente', 'success');
    },
    onError: (err: any) => {
      Swal.fire(
        'Error',
        err.response?.data?.message || 'Error al guardar',
        'error',
      );
    },
  });

  const handleAction = async (event: any) => {
    const { row, field } = event;

    if (field === 'delete') {
      const result = await Swal.fire({
        title: '¿Eliminar Repartidor?',
        text: 'Se eliminará el acceso y el perfil operativo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
      });
      if (result.isConfirmed) await deleteMutation.mutateAsync(row.delivery_id);
    }

    if (field === 'edit') {
      setSelectedDelivery(row);
      setIsModalOpen(true);
    }
  };

  const openCreateModal = () => {
    setSelectedDelivery(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Gestión de Repartidores
            </h1>
            <p className="text-slate-500 mt-1">
              Administra tu flota y vehículos.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <PersonAddIcon fontSize="small" /> Nuevo Repartidor
          </button>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <DeliveriesTable setAction={handleAction} />
        </section>

        <DeliveryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          delivery={selectedDelivery}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isLoading}
        />
      </div>
    </div>
  );
};
