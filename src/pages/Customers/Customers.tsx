import { CustomersTable } from './components/CustomersTable';
import { deleteCustomer } from '../../services/api/customers';
import { useCRUDModal } from '../../hooks';
import Swal from 'sweetalert2';

export const Customers = () => {
  const { deleteMutation } = useCRUDModal({
    deleteFn: deleteCustomer,
    queryKey: 'customers',
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
      // Aquí podrías abrir un modal para editar datos específicos del cliente (no del usuario)
      // Como validar manualmente, cambiar lat/lng, etc.
      console.log('Editar cliente:', row);
    }
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

          {/* Botón eliminado intencionalmente */}
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <CustomersTable setAction={handleAction} />
        </section>
      </div>
    </div>
  );
};
