import { useEffect, useMemo, useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { SearchCheck } from 'lucide-react';
import {
  Button,
  Card,
  FilterChips,
  PageHeader,
  SearchInput,
  Tabs,
  tabPanelProps,
  type FilterChip,
  type TabItem,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import type { Customer } from '../../services/api/types';
import { SEGMENT_SCAN_LIMIT, useCustomerScan, useCustomers, useDeleteCustomer } from '../../services/queries/customers';
import { confirm, notify } from '../../utils/notifications';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomersTable } from './components/CustomersTable';
import { FindCustomerByUserModal } from './components/FindCustomerByUserModal';
import {
  CUSTOMER_SEGMENTS,
  CUSTOMER_SEGMENT_LABELS,
  countCustomersBySegment,
  filterCustomers,
  type CustomerSegment,
} from './customerSegments';

type FormState = { open: false } | { open: true; customer: Customer | null };

const TABS_ID = 'customers';
const PAGE_SIZE = 10;

export const Customers = () => {
  const { canManageCustomerAccounts } = usePermissions();
  // La búsqueda, el segmento y la página viven en la URL: al volver de una ficha se conservan.
  const [{ q: search, status: statusParam, page: pageParam }, setFilters] = useUrlParams({
    q: '',
    status: 'all',
    page: '1',
  });
  const debouncedSearch = useDebounce(search.trim());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(pageParam) - 1 || 0), pageSize: PAGE_SIZE };
  const setPagination = (model: GridPaginationModel) => setFilters({ page: String(model.page + 1) });
  const [form, setForm] = useState<FormState>({ open: false });
  const [findingByUser, setFindingByUser] = useState(false);

  // Con hasta 100 clientes entran todos y se segmenta en el panel; con más, sólo la lista del servidor ("Todos").
  const scan = useCustomerScan();
  const scanned = scan.data && scan.data.total <= SEGMENT_SCAN_LIMIT ? scan.data.rows : null;
  const segment: CustomerSegment = scanned ? (CUSTOMER_SEGMENTS.find((s) => s === statusParam) ?? 'all') : 'all';
  const counts = useMemo(() => (scanned ? countCustomersBySegment(scanned) : null), [scanned]);

  const server = useCustomers(pagination, debouncedSearch);
  const local = useMemo(
    () => (scanned ? filterCustomers(scanned, { segment, term: search }) : null),
    [scanned, segment, search],
  );
  const rows = local
    ? local.slice(pagination.page * PAGE_SIZE, (pagination.page + 1) * PAGE_SIZE)
    : (server.data?.rows ?? []);
  const total = local ? local.length : (server.data?.total ?? 0);
  const loading = local ? false : server.isFetching;
  // Una `?page=` fuera de rango (o una página que quedó vacía tras dar de baja) vuelve a la primera.
  useEffect(() => {
    if (!loading && total > 0 && rows.length === 0 && pagination.page > 0) setFilters({ page: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, total, rows.length, pagination.page]);
  const deleteCustomer = useDeleteCustomer();

  const tabs: TabItem[] = (scanned ? CUSTOMER_SEGMENTS : (['all'] as CustomerSegment[])).map((s) => ({
    id: s,
    label: CUSTOMER_SEGMENT_LABELS[s],
    count: s === 'all' && !counts ? (server.data?.total ?? null) : (counts?.[s] ?? null),
    tone: s === 'blocked' ? 'danger' : s === 'active' ? 'success' : undefined,
  }));

  const chips: FilterChip[] = [];
  if (segment !== 'all') chips.push({ key: 'status', label: CUSTOMER_SEGMENT_LABELS[segment] });
  if (search.trim()) chips.push({ key: 'q', label: `"${search.trim()}"` });
  const removeChip = (key: string) =>
    setFilters(key === 'status' ? { status: 'all', page: '1' } : { q: '', page: '1' });

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
        <Tabs
          items={tabs}
          value={segment}
          onChange={(id) => setFilters({ status: id, page: '1' })}
          label="Filtrar clientes por estado de la cuenta"
          idPrefix={TABS_ID}
        />
        <div {...tabPanelProps(TABS_ID, segment)}>
          <div className="flex flex-col gap-3 border-b border-outline p-4">
            <SearchInput
              label="Buscar clientes"
              placeholder="Nombre, email o teléfono"
              value={search}
              onChange={(e) => setFilters({ q: e.target.value, page: '1' })}
            />
            {chips.length > 0 ? (
              <FilterChips
                items={chips}
                onRemove={removeChip}
                onClearAll={() => setFilters({ q: '', status: 'all', page: '1' })}
                resultCount={local || server.data ? total : undefined}
              />
            ) : (
              <p className="text-sm text-muted" aria-live="polite">
                {local || server.data ? `${total} ${total === 1 ? 'cliente' : 'clientes'}` : ''}
              </p>
            )}
          </div>
          <CustomersTable
            rows={rows}
            total={total}
            loading={loading}
            filtered={chips.length > 0}
            pagination={pagination}
            onPaginationChange={setPagination}
            onEdit={canManageCustomerAccounts ? (customer) => setForm({ open: true, customer }) : undefined}
            onDelete={canManageCustomerAccounts ? (customer) => void handleDelete(customer) : undefined}
          />
        </div>
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
