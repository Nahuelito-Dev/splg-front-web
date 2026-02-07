// Eliminé 'useState' y 'Lead' de los imports porque no se usan por ahora
import { LeadsTable } from './components/LeadsTable';
import { deleteUser } from '../../services/api/users';
import { useCRUDModal } from '../../hooks';
import Swal from 'sweetalert2';

export const Leads = () => {
  // ❌ Eliminado: const [lead, setLead] = useState<Lead | undefined>();

  const { deleteMutation } = useCRUDModal({
    deleteFn: deleteUser,
    queryKey: 'users',
  });

  const handleCellClick = async (event: any) => {
    const { row, field } = event;

    if (field === 'delete') {
      const result = await Swal.fire({
        title: '¿Eliminar permanentemente?',
        text: `Se borrará a "${row.full_name}" de la Base de Datos y de Firebase. ¡Esta acción es irreversible!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, destruir usuario',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        Swal.fire({
          title: 'Eliminando...',
          text: 'Contactando con Firebase y DB...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        try {
          await deleteMutation.mutateAsync(row.user_id);
          Swal.fire(
            '¡Eliminado!',
            'El usuario ha sido purgado del sistema correctamente.',
            'success',
          );
        } catch (error: any) {
          console.error(error);
          Swal.fire(
            'Error',
            error.response?.data?.message || 'No se pudo eliminar el usuario.',
            'error',
          );
        }
      }
    }

    if (field === 'edit') {
      // ❌ Eliminado: setLead(row);
      // ✅ Agregado: Log temporal para saber que funciona el click
      console.log('Editar usuario (Próximamente):', row);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Gestión de Usuarios
            </h1>
            <p className="text-slate-500 mt-1 text-lg">
              Administración total de usuarios
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
              + Nuevo Usuario
            </button>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <LeadsTable setLead={handleCellClick} />
        </section>
      </div>
    </div>
  );
};
