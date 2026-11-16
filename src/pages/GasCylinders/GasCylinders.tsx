import { useEffect, useMemo, useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Switch,
  type FilterChip,
  PageContainer,
  TableToolbar,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import { useImportActions } from '../../hooks/useImportActions';
import { gasCylinderQuery } from '../../services/api/gasCylinders';
import type { CatalogCylinder } from '../../services/api/gasCylinders';
import {
  useAvailableGasCylinders,
  useDeleteGasCylinder,
  useGasCylinderByType,
  useGasCylinders,
  useGasCylinderTypes,
  useInactiveGasCylinders,
  useReactivateGasCylinder,
} from '../../services/queries/gasCylinders';
import { confirm, notify } from '../../utils/notifications';
import { CylinderFormModal } from './components/CylinderFormModal';
import { CylindersTable } from './components/CylindersTable';
import { StockAdjustModal } from './components/StockAdjustModal';
import { ALL_TYPES, buildTypeOptions, resolveTypeFilter } from './components/typeOptions';

type FormState = { open: false } | { open: true; cylinder: CatalogCylinder | null };

export const GasCylinders = () => {
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [form, setForm] = useState<FormState>({ open: false });
  const [stockTarget, setStockTarget] = useState<CatalogCylinder | null>(null);

  // Los filtros viven en la URL: al volver de una ficha o recargar, el catálogo queda como estaba.
  const [{ q: search, type: typeFilterChoice, available: availableParam, inactive: inactiveParam }, setFilters] =
    useUrlParams({
      q: '',
      type: ALL_TYPES,
      available: '',
      inactive: '',
    });
  // «Dados de baja» (CU-269) es otra vista del catálogo: no se combina con el tipo exacto ni con «sólo disponibles».
  const onlyInactive = inactiveParam === '1';
  const onlyAvailable = availableParam === '1' && !onlyInactive;
  const debouncedSearch = useDebounce(search.trim());

  // El combo sale del catálogo completo (con o sin stock): una garrafa agotada también se filtra.
  const types = useGasCylinderTypes();
  const typeOptions = useMemo(() => buildTypeOptions(types.data?.rows ?? []), [types.data]);
  // Si el tipo elegido desapareció del catálogo, el filtro vuelve solo a "todos".
  const typeFilter = types.data ? resolveTypeFilter(typeFilterChoice, typeOptions) : typeFilterChoice;
  const typeSelected = typeFilter !== ALL_TYPES && !onlyInactive;

  // Lo que la app del cliente puede pedir ahora (activo y con stock) para el interruptor "Sólo disponibles".
  const available = useAvailableGasCylinders();
  const availableProducts = useMemo(() => available.data?.products ?? [], [available.data]);

  const catalog = useGasCylinders(pagination, debouncedSearch);
  const byType = useGasCylinderByType(typeSelected ? typeFilter : undefined);
  const inactive = useInactiveGasCylinders(pagination, debouncedSearch, onlyInactive);

  const filteredAvailable = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return term
      ? availableProducts.filter(
          (p) => p.type.toLowerCase().includes(term) || (p.description ?? '').toLowerCase().includes(term),
        )
      : availableProducts;
  }, [availableProducts, debouncedSearch]);

  const active = onlyInactive ? inactive : typeSelected ? byType : onlyAvailable ? available : catalog;
  const data = onlyInactive
    ? inactive.data
    : typeSelected
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
    // El tipo exacto ignora búsqueda y disponibles: no se dejan valores que no aplican.
    setFilters(value === ALL_TYPES ? { type: value } : { type: value, q: '', available: '', inactive: '' });
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const chips: FilterChip[] = [];
  if (search.trim()) chips.push({ key: 'q', label: `"${search.trim()}"` });
  if (typeSelected)
    chips.push({ key: 'type', label: typeOptions.find((o) => o.value === typeFilter)?.label ?? typeFilter });
  if (onlyAvailable) chips.push({ key: 'available', label: 'Sólo disponibles' });
  if (onlyInactive) chips.push({ key: 'inactive', label: 'Dados de baja' });
  const removeChip = (key: string) => {
    setFilters({ [key]: key === 'type' ? ALL_TYPES : '' });
    setPagination((p) => ({ ...p, page: 0 }));
  };
  const clearAll = () => {
    setFilters({ q: '', type: ALL_TYPES, available: '', inactive: '' });
    setPagination((p) => ({ ...p, page: 0 }));
  };

  const deleteCylinder = useDeleteGasCylinder();
  const reactivateCylinder = useReactivateGasCylinder();
  const { canWrite, writeHint } = usePermissions();
  const importing = useImportActions([
    { resource: 'garrafas', label: 'Importar garrafas' },
    { resource: 'precios', label: 'Importar precios' },
  ]);

  const handleDelete = async (cylinder: CatalogCylinder) => {
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

  const handleReactivate = async (cylinder: CatalogCylinder) => {
    const confirmed = await confirm({
      title: '¿Reactivar producto?',
      text: `"${cylinder.type}" vuelve al catálogo de la app con su stock y sus promociones.`,
      confirmText: 'Reactivar',
    });
    if (!confirmed) return;
    reactivateCylinder.mutate(cylinder.gas_cylinder_id, {
      onSuccess: () => notify.success('Producto reactivado'),
      onError: notify.error,
    });
  };

  return (
    <PageContainer>
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
        <TableToolbar
          filters={
            <>
              <Select
                label="Tipo"
                className="sm:w-44"
                value={typeFilter}
                options={typeOptions}
                onChange={(e) => selectType(e.target.value)}
              />
              <div className="flex items-center gap-2 pb-2.5">
                <Switch
                  checked={onlyAvailable}
                  disabled={typeSelected || onlyInactive}
                  title={
                    typeSelected
                      ? 'No aplica: elegiste un tipo exacto'
                      : onlyInactive
                        ? 'No aplica: estás viendo los productos dados de baja'
                        : undefined
                  }
                  label="Mostrar sólo las garrafas disponibles para la app"
                  onChange={(checked) => {
                    setFilters({ available: checked ? '1' : '' });
                    setPagination((p) => ({ ...p, page: 0 }));
                  }}
                />
                <span className="text-sm text-ink">Sólo disponibles</span>
                <Switch
                  checked={onlyInactive}
                  label="Mostrar los productos dados de baja"
                  onChange={(checked) => {
                    setFilters(checked ? { inactive: '1', type: ALL_TYPES, available: '' } : { inactive: '' });
                    setPagination((p) => ({ ...p, page: 0 }));
                  }}
                />
                <span className="text-sm text-ink">Dados de baja</span>
              </div>
            </>
          }
          search={{
            label: 'Buscar garrafas',
            placeholder: 'Tipo o descripción',
            value: search,
            disabled: typeSelected,
            title: typeSelected ? 'No aplica: elegiste un tipo exacto' : undefined,
            onChange: (value) => {
              setFilters({ q: value });
              setPagination((p) => ({ ...p, page: 0 }));
            },
          }}
          actions={importing.actions}
          serverExport={{
            resource: 'garrafas',
            params: gasCylinderQuery(debouncedSearch),
            // El exporte es del catálogo activo: no conoce las vistas por tipo, disponibles ni dadas de baja.
            blockedReason:
              typeSelected || onlyAvailable || onlyInactive
                ? 'El exporte trae el catálogo activo: quitá el tipo, «Sólo disponibles» o «Dados de baja»'
                : undefined,
          }}
          chips={loadFailed ? [] : chips}
          onRemoveChip={removeChip}
          onClearChips={clearAll}
          resultCount={!loadFailed && data ? data.total : undefined}
          noun={['producto', 'productos']}
        />
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
            filtered={chips.length > 0 && !(onlyInactive && chips.length === 1)}
            inactive={onlyInactive}
            pagination={pagination}
            onPaginationChange={setPagination}
            onEdit={canWrite ? (cylinder) => setForm({ open: true, cylinder }) : undefined}
            onAdjustStock={canWrite ? setStockTarget : undefined}
            onDelete={canWrite ? (cylinder) => void handleDelete(cylinder) : undefined}
            onReactivate={canWrite ? (cylinder) => void handleReactivate(cylinder) : undefined}
          />
        )}
      </Card>

      <CylinderFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        cylinder={form.open ? form.cylinder : null}
      />
      <StockAdjustModal open={Boolean(stockTarget)} onClose={() => setStockTarget(null)} cylinder={stockTarget} />
      {importing.wizard}
    </PageContainer>
  );
};
