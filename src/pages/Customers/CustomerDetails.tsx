import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PencilLine, Trash2 } from 'lucide-react';
import { Button, DetailSkeleton, ErrorState, IconButton } from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { useCustomer, useDeleteCustomer } from '../../services/queries/customers';
import { confirm, notify } from '../../utils/notifications';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerAddresses } from './components/details/CustomerAddresses';
import { CustomerOrders } from './components/details/CustomerOrders';
import { CustomerProfileCard } from './components/details/CustomerProfileCard';

export const CustomerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/customers');
  const { canManageCustomerAccounts } = usePermissions();
  const { data: customer, isPending, error, refetch } = useCustomer(id);
  const deleteCustomer = useDeleteCustomer();
  const [editing, setEditing] = useState(false);

  const handleDelete = async () => {
    if (!customer) return;
    const confirmed = await confirm({
      title: '¿Dar de baja al cliente?',
      text: `${customer.user?.full_name ?? 'El cliente'} no va a poder volver a entrar. Su historial de pedidos se conserva.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteCustomer.mutate(customer.customer_id, {
      onSuccess: () => {
        notify.success('Cliente dado de baja');
        navigate('/customers');
      },
      onError: notify.error,
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconButton label="Volver a clientes" icon={<ArrowLeft />} onClick={goBack} />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Ficha del cliente</h1>
        </div>
        {customer && canManageCustomerAccounts && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<PencilLine />} onClick={() => setEditing(true)}>
              Editar cuenta
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 />} onClick={() => void handleDelete()}>
              Dar de baja
            </Button>
          </div>
        )}
      </div>

      {isPending ? (
        <DetailSkeleton />
      ) : error || !customer ? (
        <ErrorState error={error} resource="El cliente" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6">
            <CustomerProfileCard customer={customer} />
            <CustomerAddresses userId={customer.user_id} />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <CustomerOrders userId={customer.user_id} />
          </div>
        </div>
      )}

      <CustomerFormModal open={editing} onClose={() => setEditing(false)} customer={customer ?? null} />
    </div>
  );
};
