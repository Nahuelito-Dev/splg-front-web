import { LeadsTable } from './components/LeadsTable';
import { deleteUser, createUser, updateUser, blockUser } from '../../services/api/users';
import { useCRUDModal } from '../../hooks';
import Swal from 'sweetalert2';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserModal } from './components/UserModal';
import { usePermisos } from '../../hooks';
import { avisarAccionNoPermitida } from '../../utils/avisos';

export const Leads = () => {
  const { puedeAdministrarCuentasDeClientes } = usePermisos();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { deleteMutation } = useCRUDModal({
    deleteFn: deleteUser,
    queryKey: 'users',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedUser) {
        // UPDATE
        return await updateUser(selectedUser.user_id, {
          full_name: data.full_name,
          phone_number: data.phone_number,
          blocked: data.blocked,
        });
      }
      // CREATE
      return await createUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsModalOpen(false);
      Swal.fire({
        title: 'Éxito',
        text: 'Usuario guardado correctamente',
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
        } else if (errorMessage.toLowerCase().includes('duplicate') || errorMessage.includes('already exists')) {
          errorMessage = 'El correo electrónico o teléfono ya está registrado.';
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

  const blockMutation = useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) =>
      blockUser(userId, block),
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });

  const handleCellClick = async (event: any) => {
    const { row, field } = event;
    const esCliente = row.role?.type === 'customer' || !!row.customer;
    if (
      !puedeAdministrarCuentasDeClientes &&
      esCliente &&
      ['edit', 'block', 'delete'].includes(field)
    ) {
      avisarAccionNoPermitida();
      return;
    }

    if (field === 'block') {
      const willBlock = !row.blocked;
      const result = await Swal.fire({
        title: willBlock ? '¿Bloquear usuario?' : '¿Desbloquear usuario?',
        text: willBlock
          ? `"${row.full_name}" no va a poder operar hasta desbloquearlo.`
          : `"${row.full_name}" vuelve a poder operar.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: willBlock ? 'Sí, bloquear' : 'Sí, desbloquear',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: `${willBlock ? 'bg-amber-500' : 'bg-emerald-600'} text-white px-5 py-2 mx-1 rounded-lg`,
          cancelButton: 'bg-slate-200 text-slate-600 px-5 py-2 mx-1 rounded-lg',
        },
        buttonsStyling: false,
      });

      if (result.isConfirmed) {
        try {
          await blockMutation.mutateAsync({
            userId: row.user_id,
            block: willBlock,
          });
          Swal.fire({
            title: willBlock ? 'Bloqueado' : 'Desbloqueado',
            text: `El usuario fue ${willBlock ? 'bloqueado' : 'desbloqueado'} correctamente.`,
            icon: 'success',
            confirmButtonText: 'OK',
            customClass: {
              popup: 'rounded-2xl shadow-xl',
              confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg',
            },
            buttonsStyling: false,
          });
        } catch (error: any) {
          Swal.fire({
            title: 'Error',
            text:
              error.response?.data?.message ||
              'No se pudo cambiar el estado del usuario.',
            icon: 'error',
            confirmButtonText: 'OK',
            customClass: {
              popup: 'rounded-2xl shadow-xl',
              confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg',
            },
            buttonsStyling: false,
          });
        }
      }
      return;
    }

    if (field === 'delete') {
      const result = await Swal.fire({
        title: '¿Eliminar permanentemente?',
        text: `Se borrará a "${row.full_name}" de la Base de Datos. ¡Esta acción es irreversible!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'Sí, destruir usuario',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-rose-500 text-white px-5 py-2 mx-1 rounded-lg',
          cancelButton: 'bg-slate-200 text-slate-600 px-5 py-2 mx-1 rounded-lg'
        },
        buttonsStyling: false
      });

      if (result.isConfirmed) {
        Swal.fire({
          title: 'Eliminando...',
          text: 'Contactando con Firebase y DB...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
          customClass: {
            popup: 'rounded-2xl shadow-xl'
          }
        });

        try {
          await deleteMutation.mutateAsync(row.user_id);
          Swal.fire({
            title: '¡Eliminado!',
            text: 'El usuario ha sido purgado del sistema correctamente.',
            icon: 'success',
            confirmButtonText: 'OK',
            customClass: {
              popup: 'rounded-2xl shadow-xl',
              confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg'
            },
            buttonsStyling: false
          });
        } catch (error: any) {
          console.error(error);
          Swal.fire({
            title: 'Error',
            text: error.response?.data?.message || 'No se pudo eliminar el usuario.',
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
      setSelectedUser(row);
      setIsModalOpen(true);
    }
  };

  const openCreateModal = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
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
            <button
              onClick={openCreateModal}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
            >
              + Nuevo Usuario
            </button>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <LeadsTable
            setLead={handleCellClick}
            puedeAdministrarClientes={puedeAdministrarCuentasDeClientes}
          />
        </section>

        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={selectedUser}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isLoading}
        />
      </div>
    </div>
  );
};
