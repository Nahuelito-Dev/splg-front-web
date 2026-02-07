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
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
      });

      if (result.isConfirmed) {
        try {
          await deleteMutation.mutateAsync(row.customer_id);
          Swal.fire('Eliminado', 'El cliente ha sido eliminado.', 'success');
        } catch (error) {
          Swal.fire('Error', 'No se pudo eliminar al cliente.', 'error');
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
