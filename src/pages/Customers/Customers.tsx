import { useEffect, useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { SearchCheck } from 'lucide-react';
import {
  AnalyticSummary,
  Button,
  Card,
  PageHeader,
  SelectionBar,
  TableToolbar,
  Tabs,
  tabPanelProps,
  type AnalyticItem,
  type FilterChip,
  type TabItem,
  PageContainer,
  EmptyState,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import { customerQuery } from '../../services/api/customers';
import type { Customer } from '../../services/api/types';
import {
  useCustomerStatusCounts,
  useCustomers,
  useRemoveCustomer,
  useRemovedCustomerCount,
  useRemovedCustomers,
  useRestoreCustomer,
} from '../../services/queries/customers';
import { confirm, notify } from '../../utils/notifications';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomersTable } from './components/CustomersTable';
import { FindCustomerByUserModal } from './components/FindCustomerByUserModal';
import { RemovedCustomersTable } from './components/RemovedCustomersTable';
import { removalConfirmation, restoreConfirmation, removalError } from './customerRemoval';
import { CUSTOMER_SEGMENTS, CUSTOMER_SEGMENT_LABELS, type CustomerSegment } from './customerSegments';
import { asText, csvDateTime } from '../../utils/csv';

type FormState = { open: false } | { open: true; customer: Customer | null };

const TABS_ID = 'customers';
const PAGE_SIZE = 10;
const CSV_HEADERS = ['Cliente', 'Email', 'Teléfono', 'Alta'];

export const Customers = () => {
  const { canManageCustomerAccounts, needsDistributor, operateHint } = usePermissions();
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

  // El estado de la cuenta y la búsqueda los resuelve la API (`?status=`, `?term=`); los conteos son sus totales reales.
  const segment: CustomerSegment = CUSTOMER_SEGMENTS.find((s) => s === statusParam) ?? 'all';
  const removedView = segment === 'removed';
  const statusFilter = segment === 'all' || removedView ? undefined : segment;
  const active = useCustomers(pagination, debouncedSearch, statusFilter, !removedView);
  // La lista de dados de baja es por distribuidora: sin «Ver como» el back responde 400, así que ni se pide.
  const removed = useRemovedCustomers(pagination, debouncedSearch, removedView && !needsDistributor);
  const server = removedView ? removed : active;
  const counts = {
    ...useCustomerStatusCounts(debouncedSearch),
    removed: useRemovedCustomerCount(debouncedSearch, !needsDistributor),
  };
  const rows = server.data?.rows ?? [];
  const total = server.data?.total ?? 0;
  const loading = server.isFetching;
  // Una `?page=` fuera de rango (o una página que quedó vacía tras dar de baja) vuelve a la primera.
  useEffect(() => {
    if (!loading && total > 0 && rows.length === 0 && pagination.page > 0) setFilters({ page: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, total, rows.length, pagination.page]);
  const removeCustomer = useRemoveCustomer();
  const restoreCustomer = useRestoreCustomer();

  // La selección es sólo de lo que se ve: cambiar de segmento, búsqueda o página la suelta.
  const [selected, setSelected] = useState<Record<string, Customer>>({});
  const clearSelection = () => setSelected({});
  const changeFilters = (patch: Parameters<typeof setFilters>[0]) => {
    clearSelection();
    setFilters(patch);
  };
  const visibleIds = new Set(rows.map((customer) => customer.customer_id));
  const selectedCustomers = Object.values(selected).filter((customer) => visibleIds.has(customer.customer_id));
  const handleSelection = (ids: string[]) =>
    setSelected((previous) => {
      const known = { ...previous, ...Object.fromEntries(rows.map((customer) => [customer.customer_id, customer])) };
      return Object.fromEntries(ids.flatMap((id) => (known[id] ? [[id, known[id]]] : [])));
    });
  const toCsvRows = (list: Customer[]) =>
    list.map((customer) => [
      customer.user?.full_name ?? '',
      customer.user?.email ?? '',
      asText(customer.user?.phone_number),
      csvDateTime(customer.createdAt),
    ]);

  const summary: AnalyticItem[] = [
    { key: 'active', label: CUSTOMER_SEGMENT_LABELS.active, count: counts.active, tone: 'success' },
    { key: 'blocked', label: CUSTOMER_SEGMENT_LABELS.blocked, count: counts.blocked, tone: 'danger' },
  ];

  const tabs: TabItem[] = CUSTOMER_SEGMENTS.map((s) => ({
    id: s,
    label: CUSTOMER_SEGMENT_LABELS[s],
    count: counts[s],
    tone: s === 'blocked' ? 'danger' : s === 'active' ? 'success' : undefined,
  }));

  const chips: FilterChip[] = [];
  if (segment !== 'all') chips.push({ key: 'status', label: CUSTOMER_SEGMENT_LABELS[segment] });
  if (search.trim()) chips.push({ key: 'q', label: `"${search.trim()}"` });
  const removeChip = (key: string) =>
    changeFilters(key === 'status' ? { status: 'all', page: '1' } : { q: '', page: '1' });

  const handleDelete = async (customer: Customer) => {
    const confirmed = await confirm(removalConfirmation(customer.user?.full_name));
    if (!confirmed) return;
    removeCustomer.mutate(customer.customer_id, {
      onSuccess: () => notify.success('Cliente dado de baja'),
      onError: (error) => notify.error(removalError(error)),
    });
  };

  const handleRestore = async (customer: Customer) => {
    const confirmed = await confirm(restoreConfirmation(customer.user?.full_name));
    if (!confirmed) return;
    restoreCustomer.mutate(customer.customer_id, {
      onSuccess: () => notify.success('Cliente reactivado'),
      onError: (error) => notify.error(removalError(error)),
    });
  };

  return (
    <PageContainer>
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

      <AnalyticSummary
        label="Clientes por estado de la cuenta"
        items={summary}
        selected={segment === 'all' ? undefined : segment}
        onSelect={(key) => changeFilters({ status: key === segment ? 'all' : key, page: '1' })}
      />

      <Card>
        <Tabs
          items={tabs}
          value={segment}
          onChange={(id) => changeFilters({ status: id, page: '1' })}
          label="Filtrar clientes por estado de la cuenta"
          idPrefix={TABS_ID}
        />
        <div {...tabPanelProps(TABS_ID, segment)}>
          <TableToolbar
            search={{
              label: 'Buscar clientes',
              // Los dados de baja se buscan por nombre o teléfono (el back no busca por correo ahí).
              placeholder: removedView ? 'Nombre o teléfono' : 'Nombre, email o teléfono',
              value: search,
              onChange: (value) => changeFilters({ q: value, page: '1' }),
            }}
            serverExport={
              removedView ? undefined : { resource: 'clientes', params: customerQuery(debouncedSearch, statusFilter) }
            }
            csv={
              selectedCustomers.length > 0
                ? {
                    filename: 'clientes',
                    label: 'Exportar selección',
                    headers: CSV_HEADERS,
                    rows: toCsvRows(selectedCustomers),
                  }
                : undefined
            }
            chips={chips}
            onRemoveChip={removeChip}
            onClearChips={() => changeFilters({ q: '', status: 'all', page: '1' })}
            resultCount={server.data ? total : undefined}
            noun={['cliente', 'clientes']}
          />
          {removedView && needsDistributor ? (
            <EmptyState title="Elegí una distribuidora" description={operateHint} />
          ) : removedView ? (
            <RemovedCustomersTable
              rows={rows}
              total={total}
              loading={loading}
              filtered={Boolean(search.trim())}
              pagination={pagination}
              onPaginationChange={setPagination}
              onRestore={(customer) => void handleRestore(customer)}
              restoreBlockedReason={operateHint}
            />
          ) : (
            <>
              <SelectionBar count={selectedCustomers.length} noun={['cliente', 'clientes']} onClear={clearSelection}>
                <span className="text-sm text-primary-strong">Se exporta sólo la selección.</span>
              </SelectionBar>
              <CustomersTable
                rows={rows}
                total={total}
                loading={loading}
                filtered={chips.length > 0}
                pagination={pagination}
                onPaginationChange={setPagination}
                onEdit={canManageCustomerAccounts ? (customer) => setForm({ open: true, customer }) : undefined}
                selection={{ ids: Object.keys(selected), onChange: handleSelection }}
                onPageChange={clearSelection}
                onDelete={(customer) => void handleDelete(customer)}
                deleteBlockedReason={operateHint}
              />
            </>
          )}
        </div>
      </Card>

      <CustomerFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        customer={form.open ? form.customer : null}
      />
      <FindCustomerByUserModal open={findingByUser} onClose={() => setFindingByUser(false)} />
    </PageContainer>
  );
};
