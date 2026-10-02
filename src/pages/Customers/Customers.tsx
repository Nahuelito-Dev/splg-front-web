import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GridPaginationModel } from '@mui/x-data-grid';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { SearchCheck } from 'lucide-react';
import { Button, Card, PageHeader, SearchInput } from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import type { Customer } from '../../services/api/types';
import { useCustomers, useDeleteCustomer } from '../../services/queries/customers';
import { confirm, notify } from '../../utils/notifications';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomersTable } from './components/CustomersTable';
import { FindCustomerByUserModal } from './components/FindCustomerByUserModal';

type FormState = { open: false } | { open: true; customer: Customer | null };

export const Customers = () => {
  const { canManageCustomerAccounts } = usePermissions();
  // La búsqueda y la página viven en la URL (un solo `setParams` para que no se pisen): al volver de una ficha se conservan.
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const pageParam = params.get('page') ?? '1';
  const updateParams = (q: string, page: number) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (q) next.set('q', q);
        else next.delete('q');
        if (page > 0) next.set('page', String(page + 1));
        else next.delete('page');
        return next;
      },
      { replace: true },
    );
  const debouncedSearch = useDebounce(search.trim());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(pageParam) - 1 || 0), pageSize: 10 };
  const setPagination = (model: GridPaginationModel) => updateParams(search, model.page);
  const [form, setForm] = useState<FormState>({ open: false });
  const [findingByUser, setFindingByUser] = useState(false);

  const { data, isFetching } = useCustomers(pagination, debouncedSearch);
  const deleteCustomer = useDeleteCustomer();

  const handleSearch = (value: string) => {
    updateParams(value, 0);
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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<SearchCheck />} onClick={() => setFindingByUser(true)}>
              Buscar por usuario
            </Button>
            <Button icon={<PersonAddAlt1Icon />} onClick={() => setForm({ open: true, customer: null })}>
              Nuevo cliente
            </Button>
          </div>
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
      <FindCustomerByUserModal open={findingByUser} onClose={() => setFindingByUser(false)} />
    </div>
  );
};
