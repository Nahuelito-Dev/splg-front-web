import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Plus, Tags, Undo2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { CashCategory } from '../../services/api/types';
import { useCashCategories, useUpdateCashCategory } from '../../services/queries/finance';
import { confirm, notify } from '../../utils/notifications';
import { CATEGORY_DIRECTION, labelOf } from '../../utils/statusLabels';
import { CashCategoryFormModal } from './components/CashCategoryFormModal';

const DIRECTIONS = [
  { value: '', label: 'Ingresos y gastos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
];

/** Categorías de ingresos y gastos de las cajas (CU-230, CU-265). Las de sistema no se tocan. */
export const CashCategories = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ direction: '', inactive: '' }, 25);
  const { data, isFetching, error, refetch } = useCashCategories(pagination, {
    direction: (filters.direction || undefined) as CashCategory['direction'] | undefined,
    includeInactive: filters.inactive === '1',
  });
  const update = useUpdateCashCategory();
  const [editing, setEditing] = useState<CashCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const filtered = Boolean(filters.direction || filters.inactive);

  const setActive = async (category: CashCategory, isActive: boolean) => {
    if (!isActive) {
      const ok = await confirm({
        title: '¿Desactivar la categoría?',
        text: `«${category.name}» deja de ofrecerse para nuevos movimientos. Los ya registrados la conservan.`,
        confirmText: 'Desactivar',
        danger: true,
      });
      if (!ok) return;
    }
    update.mutate(
      { id: category.categoryId, body: { isActive } },
      {
        onSuccess: () => notify.success(isActive ? 'Categoría reactivada' : 'Categoría desactivada'),
        onError: notify.error,
      },
    );
  };

  const columns: GridColDef<CashCategory>[] = [
    {
      field: 'name',
      headerName: 'Categoría',
      flex: 1.4,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={row.name} subtitle={row.systemCode ? 'De sistema' : undefined} icon={Tags} />
      ),
    },
    {
      field: 'direction',
      headerName: 'Sentido',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(CATEGORY_DIRECTION, row.direction)} />,
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <Badge label={row.isActive ? { text: 'Activa', tone: 'success' } : { text: 'Desactivada', tone: 'neutral' }} />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`categoría ${row.name}`}
          onEdit={canWrite && !row.systemCode ? () => setEditing(row) : undefined}
          onDelete={canWrite && !row.systemCode && row.isActive ? () => void setActive(row, false) : undefined}
          deleteLabel="Desactivar"
          actions={
            canWrite && !row.systemCode && !row.isActive
              ? [{ label: 'Reactivar', icon: Undo2, onClick: () => void setActive(row, true) }]
              : []
          }
        />
      ),
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader
        title="Categorías de caja"
        description="Con qué se clasifican los ingresos y los gastos. Las de sistema las usan las rendiciones, los cobros y los pagos."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nueva categoría
          </Button>
        }
      />
      <Card>
        <div className="grid grid-cols-1 items-end gap-3 border-b border-outline p-4 sm:grid-cols-[1fr_auto]">
          <Select
            label="Sentido"
            options={DIRECTIONS}
            value={filters.direction}
            onChange={(e) => setFilters({ direction: e.target.value })}
          />
          <Checkbox
            label="Ver desactivadas"
            checked={filters.inactive === '1'}
            onChange={(e) => setFilters({ inactive: e.target.checked ? '1' : '' })}
          />
        </div>
        {error ? (
          <ErrorState error={error} resource="Las categorías" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="categorías"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.categoryId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            empty={
              filtered ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otro filtro." />
              ) : (
                <EmptyState icon={Tags} title="Todavía no hay categorías" />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell title={row.name} subtitle={row.systemCode ? 'De sistema' : undefined} icon={Tags} />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={labelOf(CATEGORY_DIRECTION, row.direction)} />
                  {!row.isActive && <Badge label={{ text: 'Desactivada', tone: 'neutral' }} />}
                </div>
                {canWrite && !row.systemCode && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                      Renombrar
                    </Button>
                    <Button
                      size="sm"
                      variant={row.isActive ? 'danger' : 'secondary'}
                      onClick={() => void setActive(row, !row.isActive)}
                    >
                      {row.isActive ? 'Desactivar' : 'Reactivar'}
                    </Button>
                  </div>
                )}
              </>
            )}
          />
        )}
      </Card>
      <CashCategoryFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        category={editing}
      />
    </div>
  );
};
