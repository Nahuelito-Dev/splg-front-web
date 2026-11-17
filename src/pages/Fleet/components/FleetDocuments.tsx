import type { GridColDef } from '@mui/x-data-grid';
import { useCallback, useMemo, useState } from 'react';
import { CirclePlus, ShieldAlert, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  IdentityCell,
  RowActions,
  CardHeader,
} from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { FleetTask } from '../../../services/api/types';
import { useCancelFleetTask, useCarDocuments, useDriverDocuments } from '../../../services/queries/fleet';
import { formatDay, formatNumber } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { FLEET_EXPIRATION_STATUS, FLEET_TASK_STATUS, labelOf } from '../../../utils/statusLabels';
import { FleetTaskCloseModal } from './FleetTaskCloseModal';
import { FleetTaskDetailModal } from './FleetTaskDetailModal';
import { FleetTaskFormModal } from './FleetTaskFormModal';

interface Props {
  subject: 'vehicle' | 'driver';
  /** `carId` si subject es "vehicle"; `deliveryId` si es "driver". */
  ownerId: string;
  carType?: string | null;
  canWrite: boolean;
  /** Por qué no puede cargar documentación ahora mismo (el título del botón deshabilitado). */
  writeHint?: string;
}

type FormState = { open: false } | { open: true; task: FleetTask | null };

const isOpenTask = (status: FleetTask['status']) => status !== 'done' && status !== 'cancelled';

/** Documentación de la flota: un vehículo (seguro, VTV, service) o un chofer (licencia). */
export const FleetDocuments = ({ subject, ownerId, carType, canWrite, writeHint }: Props) => {
  const { needsDistributor } = usePermissions();
  // Las dos consultas se declaran siempre (reglas de los hooks); sólo una queda habilitada.
  // Sin distribuidora elegida (super_admin sin "Ver como") ninguna de las dos se dispara: la
  // API la rechaza con un 400 técnico ("Falta la distribuidora...") que no hay que mostrar.
  const carDocs = useCarDocuments(subject === 'vehicle' ? ownerId : undefined, !needsDistributor);
  const driverDocs = useDriverDocuments(subject === 'driver' ? ownerId : undefined, !needsDistributor);
  const { data, isPending, error, refetch } = subject === 'vehicle' ? carDocs : driverDocs;

  const [form, setForm] = useState<FormState>({ open: false });
  const [detail, setDetail] = useState<FleetTask | null>(null);
  const [closing, setClosing] = useState<FleetTask | null>(null);
  const cancelTask = useCancelFleetTask();

  const tasks = data?.tasks ?? [];

  const handleCancel = useCallback(
    async (task: FleetTask) => {
      const confirmed = await confirm({
        title: '¿Cancelar la tarea?',
        text: `Se cancela «${task.plan?.name ?? 'la tarea'}». No se puede deshacer.`,
        confirmText: 'Cancelar tarea',
        danger: true,
      });
      if (!confirmed) return;
      cancelTask.mutate(
        { id: task.taskId, body: {} },
        { onSuccess: () => notify.success('Tarea cancelada'), onError: notify.error },
      );
    },
    [cancelTask],
  );

  const columns = useMemo<GridColDef<FleetTask>[]>(
    () => [
      {
        field: 'plan',
        headerName: 'Documento',
        flex: 1.2,
        minWidth: 200,
        valueGetter: ({ row }) => row.plan?.name ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.plan?.name ?? 'Plan eliminado'}
            subtitle={row.referenceNumber || row.category || undefined}
            monoSubtitle={Boolean(row.referenceNumber)}
          />
        ),
      },
      {
        field: 'dueAt',
        headerName: 'Vencimiento',
        width: 170,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">
              {row.dueAt ? formatDay(row.dueAt) : row.dueKm !== null ? `${formatNumber(row.dueKm)} km` : '—'}
            </span>
            {row.expirationStatus && (
              <span className="mt-0.5 block">
                <Badge label={labelOf(FLEET_EXPIRATION_STATUS, row.expirationStatus)} />
              </span>
            )}
          </div>
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ row }) => <Badge label={labelOf(FLEET_TASK_STATUS, row.status)} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 136,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={row.plan?.name ?? 'tarea'}
            onView={() => setDetail(row)}
            onEdit={canWrite && isOpenTask(row.status) ? () => setForm({ open: true, task: row }) : undefined}
            actions={
              canWrite && isOpenTask(row.status)
                ? [
                    { label: 'Cerrar tarea', icon: CirclePlus, onClick: () => setClosing(row) },
                    {
                      label: 'Cancelar',
                      icon: XCircle,
                      tone: 'danger' as const,
                      onClick: () => void handleCancel(row),
                    },
                  ]
                : []
            }
          />
        ),
      },
    ],
    [canWrite, handleCancel],
  );

  if (needsDistributor) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Elegí una distribuidora"
          description="Como administrador general, elegí una con «Ver como» para ver y cargar su documentación."
        />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <ErrorState error={error} resource="La documentación" onRetry={() => void refetch()} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline p-4">
        <div>
          <CardHeader title="Documentación" className="" />
          <p className="text-sm text-muted">
            {subject === 'vehicle' ? 'Seguro, VTV y service del vehículo.' : 'Licencia de conducir del chofer.'}
          </p>
        </div>
        <Button
          size="sm"
          icon={<CirclePlus />}
          disabled={!canWrite}
          title={writeHint}
          onClick={() => setForm({ open: true, task: null })}
        >
          Nueva tarea
        </Button>
      </div>

      {data?.isLocked && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          {subject === 'vehicle'
            ? 'Tiene una habilitación vencida: el vehículo no puede salir a operar.'
            : 'Tiene una habilitación vencida: el chofer no puede salir a operar.'}
        </div>
      )}

      <div className="p-2">
        <DataTable
          rows={tasks}
          columns={columns}
          getRowId={(row) => row.taskId}
          loading={isPending}
          onRowClick={setDetail}
          empty={
            <EmptyState
              title="Sin documentación cargada"
              description="Agregá una tarea para empezar a seguir sus vencimientos."
            />
          }
        />
      </div>

      <FleetTaskFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        subject={subject}
        ownerId={ownerId}
        carType={carType}
        task={form.open ? form.task : null}
      />
      <FleetTaskDetailModal
        task={detail}
        onClose={() => setDetail(null)}
        canWrite={canWrite}
        onEdit={(task) => {
          setDetail(null);
          setForm({ open: true, task });
        }}
        onRequestClose={(task) => {
          setDetail(null);
          setClosing(task);
        }}
      />
      <FleetTaskCloseModal open={Boolean(closing)} onClose={() => setClosing(null)} task={closing} />
    </Card>
  );
};
