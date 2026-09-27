import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Button, Card, PageHeader, SearchInput } from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import type { GasCylinder } from '../../services/api/types';
import { useDeleteGasCylinder, useGasCylinders } from '../../services/queries/gasCylinders';
import { confirm, notify } from '../../utils/notifications';
import { CylinderFormModal } from './components/CylinderFormModal';
import { CylindersTable } from './components/CylindersTable';
import { StockAdjustModal } from './components/StockAdjustModal';

type FormState = { open: false } | { open: true; cylinder: GasCylinder | null };

export const GasCylinders = () => {
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [form, setForm] = useState<FormState>({ open: false });
  const [stockTarget, setStockTarget] = useState<GasCylinder | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const { data, isFetching } = useGasCylinders(pagination, debouncedSearch);
  const deleteCylinder = useDeleteGasCylinder();
  const { canWrite, writeHint } = usePermissions();

  const handleDelete = async (cylinder: GasCylinder) => {
    const confirmed = await confirm({
      title: '¿Desactivar producto?',
      text: `"${cylinder.type}" deja de estar disponible en la app. No se borra el historial de pedidos.`,
      confirmText: 'Desactivar',
      danger: true,
    });
    if (!confirmed) return;
    deleteCylinder.mutate(cylinder.gas_cylinder_id, {
      onSuccess: () => notify.success('Producto desactivado'),
      onError: notify.error,
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Catálogo de garrafas"
        description="Los tipos de producto que vende la distribuidora, su stock y sus promociones."
        actions={
          <Button
            icon={<AddCircleOutlineIcon />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => setForm({ open: true, cylinder: null })}
          >
            Nueva garrafa
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-outline p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            label="Buscar garrafas"
            placeholder="Tipo o descripción"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 0 }));
            }}
          />
          <p className="text-sm text-muted" aria-live="polite">
            {data ? `${data.total} ${data.total === 1 ? 'producto' : 'productos'}` : ''}
          </p>
        </div>
        <CylindersTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          loading={isFetching}
          pagination={pagination}
          onPaginationChange={setPagination}
          onEdit={canWrite ? (cylinder) => setForm({ open: true, cylinder }) : undefined}
          onAdjustStock={canWrite ? setStockTarget : undefined}
          onDelete={canWrite ? (cylinder) => void handleDelete(cylinder) : undefined}
        />
      </Card>

      <CylinderFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        cylinder={form.open ? form.cylinder : null}
      />
      <StockAdjustModal open={Boolean(stockTarget)} onClose={() => setStockTarget(null)} cylinder={stockTarget} />
    </div>
  );
};
