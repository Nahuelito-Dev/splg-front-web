import { useEffect, useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { SearchCheck } from 'lucide-react';
import {
  Button,
  Card,
  FilterChips,
  PageHeader,
  SearchInput,
  tabPanelProps,
  type FilterChip,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import type { Delivery } from '../../services/api/types';
import {
  useDeleteDelivery,
  useDeliveries,
  useDeliveryStatusCounts,
  useInvalidateDelivery,
  useValidateDelivery,
  type DeliveriesStatusTab,
} from '../../services/queries/deliveries';
import { confirm, notify } from '../../utils/notifications';
import { DeliveriesTable } from './components/DeliveriesTable';
import { DeliveryFormModal } from './components/DeliveryFormModal';
import { DELIVERY_TABS_ID, DeliveryStatusTabs } from './components/DeliveryStatusTabs';
import { DELIVERY_TAB_LABELS, isDeliveriesStatusTab } from './deliveryTabs';
import { FindDeliveryByUserModal } from './components/FindDeliveryByUserModal';

type FormState = { open: false } | { open: true; delivery: Delivery | null };

export const Deliveries = () => {
  // Editar, dar de baja y validar piden la distribuidora (X-Distributor): sin «Ver como» la API contesta 400.
  const { canOperate } = usePermissions();
  // El grupo y la búsqueda viven en la URL: al volver de una ficha o recargar, la lista queda como estaba.
  const [{ status: statusParam, q: search, page: pageParam }, setFilters] = useUrlParams({
    status: 'all',
    q: '',
    page: '1',
  });
  const statusTab: DeliveriesStatusTab = isDeliveriesStatusTab(statusParam) ? statusParam : 'all';
  const debouncedSearch = useDebounce(search.trim());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(pageParam) - 1 || 0), pageSize: 10 };
  const setPagination = (model: GridPaginationModel) => setFilters({ page: String(model.page + 1) });
  const [form, setForm] = useState<FormState>({ open: false });
  const [findingByUser, setFindingByUser] = useState(false);

  const { data, isFetching } = useDeliveries(pagination, debouncedSearch, statusTab);
  const counts = useDeliveryStatusCounts();
  // Una `?page=` fuera de rango vuelve a la primera.
  useEffect(() => {
    if (data && !isFetching && data.total > 0 && data.rows.length === 0 && pagination.page > 0)
      setFilters({ page: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isFetching, pagination.page]);
  const deleteDelivery = useDeleteDelivery();
  const validateDelivery = useValidateDelivery();
  const invalidateDelivery = useInvalidateDelivery();

  const handleSearch = (value: string) => {
    setFilters({ q: value, page: '1' });
  };

  const handleStatusTab = (value: DeliveriesStatusTab) => {
    setFilters({ status: value, page: '1' });
  };

  const chips: FilterChip[] = [];
  if (statusTab !== 'all') chips.push({ key: 'status', label: DELIVERY_TAB_LABELS[statusTab] });
  if (search.trim()) chips.push({ key: 'q', label: `"${search.trim()}"` });
  const removeChip = (key: string) => (key === 'status' ? handleStatusTab('all') : handleSearch(''));

  const handleDelete = async (delivery: Delivery) => {
    const confirmed = await confirm({
      title: '¿Dar de baja al chofer?',
      text: `${delivery.user?.full_name ?? 'El chofer'} no va a poder volver a entrar. Su historial se conserva.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteDelivery.mutate(delivery.delivery_id, {
      onSuccess: () => notify.success('Chofer dado de baja'),
      onError: notify.error,
    });
  };

  const handleToggleValidated = (delivery: Delivery) => {
    const mutation = delivery.validated ? invalidateDelivery : validateDelivery;
    mutation.mutate(delivery.delivery_id, {
      onSuccess: () => notify.success(delivery.validated ? 'Validación retirada' : 'Chofer validado'),
      onError: notify.error,
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Choferes"
        description="La flota de repartidores de la distribuidora."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<SearchCheck />} onClick={() => setFindingByUser(true)}>
              Buscar por usuario
            </Button>
            <Button icon={<PersonAddAlt1Icon />} onClick={() => setForm({ open: true, delivery: null })}>
              Nuevo chofer
            </Button>
          </div>
        }
      />

      <Card>
        <DeliveryStatusTabs value={statusTab} onChange={handleStatusTab} counts={counts} />
        <div {...tabPanelProps(DELIVERY_TABS_ID, statusTab)}>
          <div className="flex flex-col gap-3 border-b border-outline p-4">
            <SearchInput
              label="Buscar choferes"
              placeholder="Nombre, email, teléfono o patente"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {chips.length > 0 ? (
              <FilterChips
                items={chips}
                onRemove={removeChip}
                onClearAll={() => {
                  setFilters({ status: 'all', q: '', page: '1' });
                }}
                resultCount={data?.total}
              />
            ) : (
              <p className="text-sm text-muted" aria-live="polite">
                {data ? `${data.total} ${data.total === 1 ? 'chofer' : 'choferes'}` : ''}
              </p>
            )}
          </div>
          <DeliveriesTable
            rows={data?.rows ?? []}
            total={data?.total ?? 0}
            loading={isFetching}
            pagination={pagination}
            onPaginationChange={setPagination}
            onEdit={canOperate ? (delivery) => setForm({ open: true, delivery }) : undefined}
            onDelete={canOperate ? (delivery) => void handleDelete(delivery) : undefined}
            onToggleValidated={canOperate ? handleToggleValidated : undefined}
            filtered={chips.length > 0}
          />
        </div>
      </Card>

      <DeliveryFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        delivery={form.open ? form.delivery : null}
      />
      <FindDeliveryByUserModal open={findingByUser} onClose={() => setFindingByUser(false)} />
    </div>
  );
};
