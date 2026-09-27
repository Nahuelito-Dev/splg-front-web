import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { Button, Card, Checkbox, PageHeader, SearchInput } from '../../common/components/ui';
import { useDebounce } from '../../hooks';
import type { Delivery } from '../../services/api/types';
import { useDeleteDelivery, useDeliveries } from '../../services/queries/deliveries';
import { confirm, notify } from '../../utils/notifications';
import { DeliveriesTable } from './components/DeliveriesTable';
import { DeliveryFormModal } from './components/DeliveryFormModal';

type FormState = { open: false } | { open: true; delivery: Delivery | null };

export const Deliveries = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const [onlyActive, setOnlyActive] = useState(false);
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [form, setForm] = useState<FormState>({ open: false });

  const { data, isFetching } = useDeliveries(pagination, debouncedSearch, onlyActive);
  const deleteDelivery = useDeleteDelivery();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const handleOnlyActive = (checked: boolean) => {
    setOnlyActive(checked);
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

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Choferes"
        description="La flota de repartidores de la distribuidora."
        actions={
          <Button icon={<PersonAddAlt1Icon />} onClick={() => setForm({ open: true, delivery: null })}>
            Nuevo chofer
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-outline p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            label="Buscar choferes"
            placeholder="Nombre, email o teléfono"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <div className="flex items-center gap-4">
            <Checkbox label="Sólo en línea" checked={onlyActive} onChange={(e) => handleOnlyActive(e.target.checked)} />
            <p className="text-sm text-muted" aria-live="polite">
              {data ? `${data.total} ${data.total === 1 ? 'chofer' : 'choferes'}` : ''}
            </p>
          </div>
        </div>
        <DeliveriesTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          loading={isFetching}
          pagination={pagination}
          onPaginationChange={setPagination}
          onEdit={(delivery) => setForm({ open: true, delivery })}
          onDelete={(delivery) => void handleDelete(delivery)}
        />
      </Card>

      <DeliveryFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        delivery={form.open ? form.delivery : null}
      />
    </div>
  );
};
