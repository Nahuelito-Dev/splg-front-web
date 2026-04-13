import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OrdersTable } from './components/OrdersTable';
import { AssignDriverModal } from './components/AssignDriverModal';
import { OrderDetailsModal } from './components/OrderDetailsModal'; // <--- IMPORTAR
import {
  assignDriverToOrder,
  cancelOrder,
  Order,
} from '../../services/api/orders';
import Swal from 'sweetalert2';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

export const Orders = () => {
  const queryClient = useQueryClient();

  // Estados
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false); // <--- NUEVO ESTADO

  // --- MUTATIONS (Igual que antes) ---
  const assignMutation = useMutation({
    mutationFn: ({
      orderId,
      deliveryId,
    }: {
      orderId: string;
      deliveryId: string;
    }) => assignDriverToOrder(orderId, deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      setIsAssignModalOpen(false);
      Swal.fire({
        title: 'Asignado',
        text: 'El pedido fue asignado manualmente.',
        icon: 'success',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg',
        },
        buttonsStyling: false,
      });
    },
    onError: (err: any) =>
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.message || 'Error',
        icon: 'error',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg',
        },
        buttonsStyling: false,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      Swal.fire({
        title: 'Cancelado',
        text: 'El pedido ha sido cancelado.',
        icon: 'success',
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg',
        },
        buttonsStyling: false,
      });
    },
  });

  // --- HANDLERS ---

  const handleOpenAssign = (order: Order) => {
    setSelectedOrder(order);
    setIsAssignModalOpen(true);
  };

  // NUEVO: Ver Detalles
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleCancel = async (order: Order) => {
    const id = order.order_id || order.id;
    const { value: reason } = await Swal.fire({
      title: '¿Cancelar Pedido?',
      input: 'text',
      inputPlaceholder: 'Motivo...',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#f43f5e',
      customClass: {
        popup: 'rounded-2xl shadow-xl',
        confirmButton: 'bg-rose-500 text-white px-5 py-3 rounded-xl font-bold',
        cancelButton: 'bg-slate-200 text-slate-600 px-5 py-3 rounded-xl font-bold',
        input: 'rounded-xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500',
      },
      buttonsStyling: false,
    });


    if (reason) cancelMutation.mutate({ orderId: id!, reason });
  };

  const onConfirmAssignment = (deliveryId: string) => {
    if (selectedOrder) {
      const id = selectedOrder.order_id || selectedOrder.id;
      assignMutation.mutate({ orderId: id!, deliveryId });
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ReceiptLongIcon fontSize="large" className="text-slate-400" />{' '}
            Pedidos en Curso
          </h1>
          <p className="text-slate-500 mt-1 ml-11">
            Monitoreo en tiempo real. Asignación automática activa.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <OrdersTable
            onAssign={handleOpenAssign}
            onCancel={handleCancel}
            onView={handleViewDetails} // <--- Pasamos la función
          />
        </section>

        {/* Modal de Asignación */}
        <AssignDriverModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onConfirm={onConfirmAssignment}
          isAssigning={assignMutation.isLoading}
        />

        {/* Modal de Detalles (NUEVO) */}
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          order={selectedOrder}
        />
      </div>
    </div>
  );
};
