import { useState } from 'react';
import { DeliveriesTable } from './components/DeliveriesTable';
import { DeliveryModal } from './components/DeliveryModal';
import {
  createDelivery,
  updateDelivery,
  deleteDelivery,
} from '../../services/api/deliveries';
import { resetUserPassword } from '../../services/api/users';
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
        const result = await updateDelivery(selectedDelivery.delivery_id, {
          isActive: data.isActive,
          validated: data.validated,
        });

        // Si se incluyó nueva contraseña, actualizarla via Firebase
        if (data.newPassword && selectedDelivery.user_id) {
          await resetUserPassword(selectedDelivery.user_id, data.newPassword);
        }

        return result;
      }
      // CREATE (Llama al endpoint complex de Users)
      return await createDelivery(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['deliveries']);
      setIsModalOpen(false);
      Swal.fire({
        title: 'Éxito',
        text: 'Repartidor guardado correctamente',
        icon: 'success',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
        },
        buttonsStyling: false
      });
    },
    onError: (err: any) => {
      let errorMessage = err.response?.data?.message || 'Error al guardar';
      
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('Invalid phone number format')) {
          errorMessage = 'Formato de teléfono inválido. Ej: +54 9 11 4333444 o +54 343 4333444';
        }else if (errorMessage.includes('User with this email already exists')) {
          errorMessage = 'El correo electrónico ya está registrado.';
        }
      }

      Swal.fire({
        title: 'Error',
        text: errorMessage,
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

  const handleAction = async (event: any) => {
    const { row, field } = event;

    if (field === 'delete') {
      const result = await Swal.fire({
        title: '¿Eliminar Repartidor?',
        text: 'Se eliminará el acceso y el perfil operativo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-rose-500 text-white px-5 py-2 rounded-lg',
          cancelButton: 'bg-slate-200 text-slate-600 px-5 py-2 rounded-lg'
        },
        buttonsStyling: false
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
