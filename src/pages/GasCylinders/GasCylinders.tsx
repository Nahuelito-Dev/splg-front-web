import { useEffect, useMemo, useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Button, Card, EmptyState, PageHeader, SearchInput, Select, Switch } from '../../common/components/ui';
import { useDebounce, usePermissions } from '../../hooks';
import type { GasCylinder } from '../../services/api/types';
import {
  useAvailableGasCylinders,
  useDeleteGasCylinder,
  useGasCylinderByType,
  useGasCylinders,
  useGasCylinderTypes,
} from '../../services/queries/gasCylinders';
import { confirm, notify } from '../../utils/notifications';
import { CylinderFormModal } from './components/CylinderFormModal';
import { CylindersTable } from './components/CylindersTable';
import { StockAdjustModal } from './components/StockAdjustModal';
import { ALL_TYPES, buildTypeOptions, resolveTypeFilter } from './components/typeOptions';

type FormState = { open: false } | { open: true; cylinder: GasCylinder | null };

export const GasCylinders = () => {
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [form, setForm] = useState<FormState>({ open: false });
  const [stockTarget, setStockTarget] = useState<GasCylinder | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilterChoice, setTypeFilter] = useState(ALL_TYPES);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const debouncedSearch = useDebounce(search.trim());

  // El combo sale del catálogo completo (con o sin stock): una garrafa agotada también se filtra.
  const types = useGasCylinderTypes();
  const typeOptions = useMemo(() => buildTypeOptions(types.data?.rows ?? []), [types.data]);
  // Si el tipo elegido desapareció del catálogo, el filtro vuelve solo a "todos".
  const typeFilter = types.data ? resolveTypeFilter(typeFilterChoice, typeOptions) : typeFilterChoice;
  const typeSelected = typeFilter !== ALL_TYPES;

  // Lo que la app del cliente puede pedir ahora (activo y con stock) para el interruptor "Sólo disponibles".
  const available = useAvailableGasCylinders();
  const availableProducts = useMemo(() => available.data?.products ?? [], [available.data]);

  const catalog = useGasCylinders(pagination, debouncedSearch);
  const byType = useGasCylinderByType(typeSelected ? typeFilter : undefined);

  const filteredAvailable = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return term
      ? availableProducts.filter(
          (p) => p.type.toLowerCase().includes(term) || (p.description ?? '').toLowerCase().includes(term),
        )
      : availableProducts;
  }, [availableProducts, debouncedSearch]);

  const active = typeSelected ? byType : onlyAvailable ? available : catalog;
  const data = typeSelected
    ? { rows: byType.data ? [byType.data] : [], total: byType.data ? 1 : 0 }
    : onlyAvailable
      ? {
          rows: filteredAvailable.slice(
            pagination.page * pagination.pageSize,
            (pagination.page + 1) * pagination.pageSize,
          ),
          total: filteredAvailable.length,
        }
      : catalog.data;
  const isFetching = active.isFetching;
  const loadFailed = active.isError;
  const firstLoad = !data && active.isPending;

  // Si al bajar el stock (o desactivar) la página actual queda vacía, vuelve a la última que tenga filas.
  const total = data?.total ?? 0;
  const pageIsEmpty = Boolean(data) && data!.rows.length === 0 && total > 0;
  useEffect(() => {
    if (!pageIsEmpty || pagination.page === 0) return;
    const lastPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);
    setPagination((p) => (p.page > lastPage ? { ...p, page: lastPage } : p));
  }, [pageIsEmpty, total, pagination.page, pagination.pageSize]);

  const retryActive = () => void active.refetch();

  const selectType = (value: string) => {
    setTypeFilter(value);
    if (value !== ALL_TYPES) {
      // El tipo exacto ignora búsqueda y disponibles: no se dejan valores que no aplican.
      setSearch('');
      setOnlyAvailable(false);
    }
    setPagination((p) => ({ ...p, page: 0 }));
  };

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
        <div className="flex flex-col gap-3 border-b border-outline p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <SearchInput
                label="Buscar garrafas"
                placeholder="Tipo o descripción"
                value={search}
                disabled={typeSelected}
                title={typeSelected ? 'No aplica: elegiste un tipo exacto' : undefined}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, page: 0 }));
                }}
              />
              <Select
                label="Tipo"
                className="sm:w-44"
                value={typeFilter}
                options={typeOptions}
                onChange={(e) => selectType(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-2.5">
              <Switch
                checked={onlyAvailable}
                disabled={typeSelected}
                title={typeSelected ? 'No aplica: elegiste un tipo exacto' : undefined}
                label="Mostrar sólo las garrafas disponibles para la app"
                onChange={(checked) => {
                  setOnlyAvailable(checked);
                  setPagination((p) => ({ ...p, page: 0 }));
                }}
              />
              <span className="text-sm text-ink">Sólo disponibles</span>
            </div>
          </div>
          <p className="text-sm text-muted" aria-live="polite">
            {loadFailed
              ? 'No se pudo cargar el catálogo'
              : firstLoad
                ? 'Cargando…'
                : data
                  ? `${data.total} ${data.total === 1 ? 'producto' : 'productos'}`
                  : ''}
          </p>
        </div>
        {loadFailed ? (
          <EmptyState
            title="No se pudo cargar el catálogo"
            description="Revisá la conexión y probá de nuevo."
            action={
              <Button variant="secondary" size="sm" onClick={retryActive}>
                Reintentar
              </Button>
            }
          />
        ) : (
          <CylindersTable
            rows={data?.rows ?? []}
            total={data?.total ?? 0}
            loading={isFetching || firstLoad}
            pagination={pagination}
            onPaginationChange={setPagination}
            onEdit={canWrite ? (cylinder) => setForm({ open: true, cylinder }) : undefined}
            onAdjustStock={canWrite ? setStockTarget : undefined}
            onDelete={canWrite ? (cylinder) => void handleDelete(cylinder) : undefined}
          />
        )}
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
