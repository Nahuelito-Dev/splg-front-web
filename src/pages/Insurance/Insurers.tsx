import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Plus, ShieldCheck } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageContainer,
  PageHeader,
  ResponsiveTable,
  RowActions,
  TableToolbar,
} from '../../common/components/ui';
import { useClampPage, useDebounce, usePermissions, useUrlPagedParams } from '../../hooks';
import type { Insurer } from '../../services/api/types';
import { useDeleteInsurer, useInsurers } from '../../services/queries/insurance';
import { formatCuit } from '../../utils/cuit';
import { confirm, notify } from '../../utils/notifications';
import { InsurerFormModal } from './components/InsurerFormModal';

const linkOf = (insurer: Insurer) =>
  insurer.paymentUrl ? (
    <a
      className="break-all text-primary hover:underline"
      href={insurer.paymentUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      {insurer.paymentUrl}
    </a>
  ) : (
    '—'
  );

const subtitleOf = (insurer: Insurer) => (insurer.taxId ? `CUIT ${formatCuit(insurer.taxId)}` : 'Sin CUIT');

/** Aseguradoras: alta, edición y baja lógica. De acá sale el enlace de pago del botón «Pagar» de cada cuota. */
export const Insurers = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ q: '' }, 10);
  const term = useDebounce(filters.q, 300);
  const [editing, setEditing] = useState<Insurer | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isFetching, error, refetch } = useInsurers(pagination, term || undefined);
  const remove = useDeleteInsurer();

  const deactivate = async (insurer: Insurer) => {
    const ok = await confirm({
      title: '¿Dar de baja la aseguradora?',
      text: `«${insurer.name}» deja de ofrecerse para nuevas pólizas. No se borra y su historial se conserva. Si tiene pólizas vigentes o futuras, no se puede.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(insurer.insurerId, {
      onSuccess: () => notify.success('Aseguradora dada de baja'),
      onError: notify.error,
    });
  };

  const columns: GridColDef<Insurer>[] = [
    {
      field: 'name',
      headerName: 'Aseguradora',
      flex: 1.4,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => <IdentityCell title={row.name} subtitle={subtitleOf(row)} icon={ShieldCheck} />,
    },
    { field: 'phone', headerName: 'Teléfono', width: 170, sortable: false, valueGetter: ({ row }) => row.phone ?? '—' },
    {
      field: 'paymentUrl',
      headerName: 'Enlace de pago',
      flex: 1.2,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => linkOf(row),
    },
    {
      field: 'actions',
      headerName: '',
      width: 150,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`aseguradora ${row.name}`}
          onEdit={canWrite ? () => setEditing(row) : undefined}
          onDelete={canWrite ? () => void deactivate(row) : undefined}
          deleteLabel="Dar de baja"
        />
      ),
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Aseguradoras"
        description="Las compañías que aseguran los vehículos y el enlace donde se pagan las cuotas."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nueva aseguradora
          </Button>
        }
      />
      <Card>
        <TableToolbar
          search={{
            label: 'Buscar aseguradoras',
            placeholder: 'Nombre',
            value: filters.q,
            onChange: (value) => setFilters({ q: value }),
          }}
          resultCount={data?.total}
          noun={['aseguradora', 'aseguradoras']}
        />
        {error ? (
          <ErrorState error={error} resource="Las aseguradoras" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="aseguradoras"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.insurerId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            empty={
              filters.q ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otra búsqueda." />
              ) : (
                <EmptyState
                  icon={ShieldCheck}
                  title="Todavía no hay aseguradoras"
                  description="Cargá la primera para poder registrar las pólizas de los vehículos."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell title={row.name} subtitle={subtitleOf(row)} icon={ShieldCheck} />
                <p className="text-sm text-ink-2">{row.phone ?? 'Sin teléfono'}</p>
                <p className="text-sm">{linkOf(row)}</p>
                {canWrite && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void deactivate(row)}>
                      Dar de baja
                    </Button>
                  </div>
                )}
              </>
            )}
          />
        )}
      </Card>
      <InsurerFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        insurer={editing}
      />
    </PageContainer>
  );
};
