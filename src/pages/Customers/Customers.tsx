import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { Button, Card, PageHeader, SearchInput } from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import type { Customer } from '../../services/api/types';
import { useCustomers, useDeleteCustomer } from '../../services/queries/customers';
import { confirm, notify } from '../../utils/notifications';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomersTable } from './components/CustomersTable';

type FormState = { open: false } | { open: true; customer: Customer | null };

export const Customers = () => {
  const { canManageCustomerAccounts } = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [form, setForm] = useState<FormState>({ open: false });

  const { data, isFetching } = useCustomers(pagination, debouncedSearch);
  const deleteCustomer = useDeleteCustomer();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const handleDelete = async (customer: Customer) => {
    const confirmed = await confirm({
      title: '¿Dar de baja al cliente?',
      text: `${customer.user?.full_name ?? 'El cliente'} no va a poder volver a entrar. Su historial de pedidos se conserva.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteCustomer.mutate(customer.customer_id, {
      onSuccess: () => notify.success('Cliente dado de baja'),
      onError: notify.error,
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Clientes"
        description="Los clientes que le compraron a la distribuidora."
        actions={
          <Button icon={<PersonAddAlt1Icon />} onClick={() => setForm({ open: true, customer: null })}>
            Nuevo cliente
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-outline p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            label="Buscar clientes"
            placeholder="Nombre, email o teléfono"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <p className="text-sm text-muted" aria-live="polite">
            {data ? `${data.total} ${data.total === 1 ? 'cliente' : 'clientes'}` : ''}
          </p>
        </div>
        <CustomersTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          loading={isFetching}
          pagination={pagination}
          onPaginationChange={setPagination}
          onEdit={canManageCustomerAccounts ? (customer) => setForm({ open: true, customer }) : undefined}
          onDelete={canManageCustomerAccounts ? (customer) => void handleDelete(customer) : undefined}
        />
      </Card>

      <CustomerFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        customer={form.open ? form.customer : null}
      />
    </div>
  );
};
