import { useState } from 'react';
import { CustomersTable, CustomerModal } from './components';
import { 
  createCustomer, 
  updateCustomer, 
  deleteCustomer 
} from '../../services/api/customers';
import { resetUserPassword } from '../../services/api/users';
import { useCRUDModal } from '../../hooks';
import Swal from 'sweetalert2';
import { Customer } from '../../interfaces';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export const Customers = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { deleteMutation } = useCRUDModal({
    deleteFn: deleteCustomer,
    queryKey: 'customers',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedCustomer) {
        // Update datos del customer
        const result = await updateCustomer(selectedCustomer.customer_id, {
          validated: data.validated,
        });

        // Si se incluyó nueva contraseña, actualizarla via Firebase
        if (data.newPassword && selectedCustomer.user_id) {
          await resetUserPassword(selectedCustomer.user_id, data.newPassword);
        }

        return result;
      }
      return await createCustomer(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setIsModalOpen(false);
      Swal.fire({
        title: 'Éxito',
        text: 'Cliente guardado correctamente',
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
      const errorMessage = err.response?.data?.message || 'Error al guardar el cliente';
      Swal.fire({
        title: 'Error',
        text: typeof errorMessage === 'string' ? errorMessage : 'Error interno del servidor',
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
        title: '¿Eliminar Cliente?',
        text: `Se eliminará al cliente "${row.user?.full_name || 'Desconocido'}" y sus datos asociados.`,
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

      if (result.isConfirmed) {
        try {
          await deleteMutation.mutateAsync(row.customer_id);
          Swal.fire({
            title: 'Eliminado',
            text: 'El cliente ha sido eliminado.',
            icon: 'success',
            confirmButtonText: 'OK',
            customClass: {
              popup: 'rounded-2xl shadow-xl',
              confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
            },
            buttonsStyling: false
          });
        } catch (error) {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar al cliente.',
            icon: 'error',
            confirmButtonText: 'OK',
            customClass: {
              popup: 'rounded-2xl shadow-xl',
              confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
            },
            buttonsStyling: false
          });
        }
      }
    }

    if (field === 'edit') {
      setSelectedCustomer(row);
      setIsModalOpen(true);
    }
  };

  const openCreateModal = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Cartera de Clientes
            </h1>
            <p className="text-slate-500 mt-1 text-lg">
              Visualiza y administra los clientes registrados desde la App.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <PersonAddIcon fontSize="small" /> Nuevo Cliente
          </button>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <CustomersTable setAction={handleAction} />
        </section>

        <CustomerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customer={selectedCustomer}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isLoading}
        />
      </div>
    </div>
  );
};
