import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Briefcase, Plus, Trash2, Undo2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  ResponsiveTable,
  RowActions,
  PageContainer,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { JobPosition } from '../../services/api/types';
import { useDeleteJobPosition, useJobPositions, useUpdateJobPosition } from '../../services/queries/employees';
import { confirm, notify } from '../../utils/notifications';
import { JobPositionFormModal } from './components/JobPositionFormModal';
import { POSITION_CATEGORY_LABELS } from './employeeLabels';

/** Puestos de trabajo de la distribuidora (CU-176): alta, edición y baja. No se puede dar de baja uno con personal activo. */
export const JobPositions = () => {
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const { data, isPending, isFetching, error, refetch } = useJobPositions(!needsDistributor);
  const update = useUpdateJobPosition();
  const remove = useDeleteJobPosition();
  const busy = update.isPending || remove.isPending;
  const [editing, setEditing] = useState<JobPosition | null>(null);
  const [creating, setCreating] = useState(false);

  /** «Dar de baja» desactiva el puesto: deja de ofrecerse para legajos nuevos y se puede reactivar. */
  const deactivate = async (position: JobPosition) => {
    if (busy) return;
    const ok = await confirm({
      title: '¿Dar de baja el puesto?',
      text: `«${position.name}» deja de ofrecerse para legajos nuevos. Los legajos que ya lo tienen no cambian y se puede reactivar.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!ok) return;
    update.mutate(
      { id: position.positionId, body: { isActive: false } },
      { onSuccess: () => notify.success('Puesto dado de baja'), onError: notify.error },
    );
  };

  const reactivate = (position: JobPosition) => {
    if (busy) return;
    update.mutate(
      { id: position.positionId, body: { isActive: true } },
      { onSuccess: () => notify.success('Puesto reactivado'), onError: notify.error },
    );
  };

  /** «Eliminar» borra el puesto de verdad: sólo corresponde si nunca se usó. */
  const eliminate = async (position: JobPosition) => {
    if (busy) return;
    const ok = await confirm({
      title: '¿Eliminar el puesto?',
      text: `Sólo se puede eliminar «${position.name}» si ningún legajo lo tuvo, tampoco los egresados, y si no es el último puesto activo de choferes o de administración. Si no, dalo de baja.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(position.positionId, {
      onSuccess: () => notify.success('Puesto dado de baja'),
      onError: notify.error,
    });
  };

  const status = (row: JobPosition) => (
    <Badge label={row.isActive ? { text: 'Vigente', tone: 'success' } : { text: 'De baja', tone: 'neutral' }} />
  );
  const staff = (row: JobPosition) =>
    `${row.activeEmployees} ${row.activeEmployees === 1 ? 'persona activa' : 'personas activas'}`;

  const columns: GridColDef<JobPosition>[] = [
    {
      field: 'name',
      headerName: 'Puesto',
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={row.name} subtitle={POSITION_CATEGORY_LABELS[row.category]} icon={Briefcase} />
      ),
    },
    {
      field: 'activeEmployees',
      headerName: 'Personal',
      width: 180,
      sortable: false,
      valueGetter: ({ row }) => staff(row),
    },
    { field: 'isActive', headerName: 'Estado', width: 120, sortable: false, renderCell: ({ row }) => status(row) },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`puesto ${row.name}`}
          onEdit={canWrite ? () => setEditing(row) : undefined}
          onDelete={canWrite && row.isActive ? () => void deactivate(row) : undefined}
          deleteLabel="Dar de baja"
          actions={
            canWrite
              ? [
                  ...(row.isActive ? [] : [{ label: 'Reactivar', icon: Undo2, onClick: () => reactivate(row) }]),
                  ...(row.activeEmployees === 0
                    ? [
                        {
                          label: 'Eliminar',
                          icon: Trash2,
                          tone: 'danger' as const,
                          onClick: () => void eliminate(row),
                        },
                      ]
                    : []),
                ]
              : []
          }
        />
      ),
    },
  ];

  return (
    <PageContainer size="md">
      <PageHeader
        title="Puestos"
        description="Los puestos de trabajo del personal. La categoría define el rol de acceso y la documentación."
        actions={
          <Button icon={<Plus />} blockedReason={writeHint} onClick={() => canWrite && setCreating(true)}>
            Nuevo puesto
          </Button>
        }
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus puestos."
          />
        </Card>
      ) : (
        <Card>
          {error ? (
            <ErrorState error={error} resource="Los puestos" onRetry={() => void refetch()} />
          ) : (
            <ResponsiveTable
              label="puestos"
              rows={data ?? []}
              columns={columns}
              getRowId={(row) => row.positionId}
              loading={isPending || isFetching}
              empty={
                <EmptyState
                  icon={Briefcase}
                  title="Todavía no hay puestos"
                  description="Cargá el primero para poder registrar legajos."
                />
              }
              renderCard={(row) => (
                <>
                  <IdentityCell title={row.name} subtitle={POSITION_CATEGORY_LABELS[row.category]} icon={Briefcase} />
                  <div className="flex flex-wrap items-center gap-2">
                    {status(row)}
                    <span className="text-sm text-muted">{staff(row)}</span>
                  </div>
                  {canWrite && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                        Editar
                      </Button>
                      {row.isActive ? (
                        <Button size="sm" variant="secondary" onClick={() => void deactivate(row)}>
                          Dar de baja
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => reactivate(row)}>
                          Reactivar
                        </Button>
                      )}
                      {row.activeEmployees === 0 && (
                        <Button size="sm" variant="danger" onClick={() => void eliminate(row)}>
                          Eliminar
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            />
          )}
        </Card>
      )}
      <JobPositionFormModal open={creating} onClose={() => setCreating(false)} position={null} />
      <JobPositionFormModal open={Boolean(editing)} onClose={() => setEditing(null)} position={editing} />
    </PageContainer>
  );
};
