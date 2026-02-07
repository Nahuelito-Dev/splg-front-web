import { useState } from 'react';
import { CylindersTable } from './components/CylindersTable';
import { CylinderModal } from './components/CylinderModal';
import {
  deleteCylinder,
  createCylinder,
  updateCylinder,
  updateCylinderStock,
} from '../../services/api/cylinders';
import { useCRUDModal } from '../../hooks';
import Swal from 'sweetalert2';
import { GasCylinder } from '../../interfaces';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PropaneIcon from '@mui/icons-material/Propane';

export const Cylinders = () => {
  const [selectedCylinder, setSelectedCylinder] = useState<GasCylinder | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // 1. Hook para Eliminar (Delete)
  const { deleteMutation } = useCRUDModal({
    deleteFn: deleteCylinder,
    queryKey: 'gascylinders',
  });

  // 2. Hook para Crear o Editar (Mutation unificada)
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Si hay un cilindro seleccionado, es EDITAR (PATCH)
      if (selectedCylinder) {
        return await updateCylinder(selectedCylinder.gas_cylinder_id, data);
      }
      // Si no, es CREAR (POST)
      return await createCylinder(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gascylinders']);
      setIsModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'El producto se ha guardado correctamente.',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error: any) => {
      console.error(error);
      const msg = error.response?.data?.message;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: Array.isArray(msg)
          ? msg[0]
          : msg || 'No se pudo guardar el producto.',
      });
    },
  });

  // 3. Manejador de Acciones de la Tabla
  const handleAction = async (event: any) => {
    const { row, field } = event;

    // --- ACCIÓN: ELIMINAR ---
    if (field === 'delete') {
      const result = await Swal.fire({
        title: '¿Desactivar Garrafa?',
        text: `El producto "${row.type}" dejará de estar visible en la App.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'Sí, desactivar',
        cancelButtonText: 'Cancelar',
        // Estilos custom para que se vea bien
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-rose-500 text-white px-5 py-2 rounded-lg',
          cancelButton: 'bg-slate-200 text-slate-600 px-5 py-2 rounded-lg',
        },
        buttonsStyling: false,
      });

      if (result.isConfirmed) {
        try {
          await deleteMutation.mutateAsync(row.gas_cylinder_id);
          Swal.fire({
            icon: 'success',
            title: 'Desactivado',
            text: 'El producto ha sido desactivado.',
            timer: 1500,
            showConfirmButton: false,
          });
        } catch (e) {
          Swal.fire('Error', 'No se pudo desactivar.', 'error');
        }
      }
    }

    // --- ACCIÓN: EDITAR ---
    if (field === 'edit') {
      setSelectedCylinder(row);
      setIsModalOpen(true);
    }

    // --- ACCIÓN: STOCK (Botón +) ---
    if (field === 'stock') {
      const { value: quantityString } = await Swal.fire({
        title: `Ingreso de Mercadería`,
        html: `
            <div class="text-left mb-4 px-4">
                <p class="text-sm text-slate-500">Producto: <b class="text-slate-800">${row.type}</b></p>
                <p class="text-sm text-slate-500">Stock Actual: <b class="text-slate-800">${row.stock}</b></p>
            </div>
            <p class="text-sm font-medium text-slate-700 mb-2">Cantidad a sumar (o - restar):</p>
        `,
        input: 'number',
        inputPlaceholder: 'Ej: 50',
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          input:
            'border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500',
          confirmButton: 'bg-emerald-500 text-white px-5 py-2 rounded-lg mt-4',
          cancelButton: 'bg-slate-200 text-slate-600 px-5 py-2 rounded-lg mt-4',
        },
        buttonsStyling: false,
        inputValidator: (value) => {
          if (!value) return 'Debes escribir un número';
          return null;
        },
      });

      if (quantityString) {
        try {
          // Parseamos el string a entero explícitamente para evitar error 400
          const quantity = parseInt(quantityString, 10);

          Swal.fire({
            title: 'Actualizando...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });

          await updateCylinderStock(row.gas_cylinder_id, quantity);

          queryClient.invalidateQueries(['gascylinders']);
          Swal.fire({
            icon: 'success',
            title: 'Stock Actualizado',
            text: `Se ajustaron ${quantity} unidades.`,
            timer: 1500,
            showConfirmButton: false,
          });
        } catch (e: any) {
          console.error(e);
          Swal.fire('Error', 'No se pudo actualizar el stock.', 'error');
        }
      }
    }
  };

  const openCreateModal = () => {
    setSelectedCylinder(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Gestión de Garrafas
            </h1>
            <p className="text-slate-500 mt-1 text-lg">
              Configura los productos disponibles en la App.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-pink-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all flex items-center gap-2 active:scale-95"
          >
            <PropaneIcon fontSize="small" /> Nueva Garrafa
          </button>
        </header>

        {/* Tabla */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <CylindersTable setLocalAction={handleAction} />
        </section>

        {/* Modal */}
        <CylinderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          cylinder={selectedCylinder}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isLoading}
        />
      </div>
    </div>
  );
};
