import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { SearchCheck } from 'lucide-react';
import { Button, Card, PageHeader, SearchInput } from '../../common/components/ui';
import { useDebounce } from '../../hooks';
import type { Delivery } from '../../services/api/types';
import {
  useDeleteDelivery,
  useDeliveries,
  useInvalidateDelivery,
  useValidateDelivery,
  type DeliveriesStatusTab,
} from '../../services/queries/deliveries';
import { confirm, notify } from '../../utils/notifications';
import { DeliveriesTable } from './components/DeliveriesTable';
import { DeliveryFormModal } from './components/DeliveryFormModal';
import { DeliveryStatusTabs } from './components/DeliveryStatusTabs';
import { FindDeliveryByUserModal } from './components/FindDeliveryByUserModal';

type FormState = { open: false } | { open: true; delivery: Delivery | null };

export const Deliveries = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const [statusTab, setStatusTab] = useState<DeliveriesStatusTab>('all');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [form, setForm] = useState<FormState>({ open: false });
  const [findingByUser, setFindingByUser] = useState(false);

  const { data, isFetching } = useDeliveries(pagination, debouncedSearch, statusTab);
  const deleteDelivery = useDeleteDelivery();
  const validateDelivery = useValidateDelivery();
  const invalidateDelivery = useInvalidateDelivery();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const handleStatusTab = (value: DeliveriesStatusTab) => {
    setStatusTab(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

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
        <div className="flex flex-col gap-3 border-b border-outline p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              label="Buscar choferes"
              placeholder="Nombre, email, teléfono o patente"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <p className="text-sm text-muted" aria-live="polite">
              {data ? `${data.total} ${data.total === 1 ? 'chofer' : 'choferes'}` : ''}
            </p>
          </div>
          <DeliveryStatusTabs value={statusTab} onChange={handleStatusTab} />
        </div>
        <DeliveriesTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          loading={isFetching}
          pagination={pagination}
          onPaginationChange={setPagination}
          onEdit={(delivery) => setForm({ open: true, delivery })}
          onDelete={(delivery) => void handleDelete(delivery)}
          onToggleValidated={handleToggleValidated}
        />
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
