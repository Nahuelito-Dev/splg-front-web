import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CirclePlus, Power, PowerOff } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  RowActions,
  Select,
  PageContainer,
  type TableColumn,
} from '../../common/components/ui';
import { FROM_LIST_STATE, usePermissions, useUrlParam } from '../../hooks';
import type { FleetPlan } from '../../services/api/types';
import { useFleetPlans, useUpdateFleetPlan } from '../../services/queries/fleet';
import { confirm, notify } from '../../utils/notifications';
import { FLEET_PLAN_SUBJECT, FLEET_TASK_CRITICALITY, labelOf } from '../../utils/statusLabels';
import { FleetPlanFormModal } from './components/FleetPlanFormModal';
import { intervalText } from './fleetPlanInterval';

const SUBJECT_FILTER_OPTIONS = [
  { value: '', label: 'Todos los planes' },
  { value: 'vehicle', label: 'Vehículo' },
  { value: 'driver', label: 'Chofer' },
  { value: 'employee', label: 'Personal' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'all', label: 'Todos' },
];

type FormState = { open: false } | { open: true; plan: FleetPlan | null };

/** Planes de mantenimiento/habilitación de la flota (CU-105/140): la REGLA que dispara las tareas. */
export const FleetPlans = () => {
  const navigate = useNavigate();
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const [subject, setSubject] = useUrlParam('subject', '');
  const [statusFilter, setStatusFilter] = useUrlParam('status', 'active');
  const [form, setForm] = useState<FormState>({ open: false });
  const updatePlan = useUpdateFleetPlan();

  const { data, isPending, error, refetch } = useFleetPlans(
    {
      subject: (subject || undefined) as FleetPlan['subject'] | undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    },
    { enabled: !needsDistributor },
  );

  const handleToggle = useCallback(
    async (plan: FleetPlan) => {
      const activate = !plan.isActive;
      const confirmed = await confirm({
        title: activate ? '¿Activar el plan?' : '¿Desactivar el plan?',
        text: activate
          ? `«${plan.name}» vuelve a generar tareas hacia adelante.`
          : `«${plan.name}» deja de generar tareas nuevas. Las tareas ya creadas no se tocan.`,
      });
      if (!confirmed) return;
      updatePlan.mutate(
        { id: plan.planId, body: { isActive: activate } },
        {
          onSuccess: () => notify.success(activate ? 'Plan activado' : 'Plan desactivado'),
          onError: notify.error,
        },
      );
    },
    [updatePlan],
  );

  const columns = useMemo<TableColumn<FleetPlan>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Plan',
        flex: 1.3,
        minWidth: 220,
        renderCell: ({ row }) => (
          <IdentityCell title={row.name} subtitle={labelOf(FLEET_PLAN_SUBJECT, row.subject).text} />
        ),
      },
      {
        field: 'trigger',
        headerName: 'Vencimiento',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }) => (
          <span className="whitespace-normal leading-snug text-ink" title={intervalText(row)}>
            {intervalText(row)}
          </span>
        ),
      },
      {
        field: 'leadTimeDays',
        headerName: 'Aviso previo',
        width: 130,
        renderCell: ({ row }) => <span className="text-ink">{row.leadTimeDays} días</span>,
      },
      {
        field: 'criticality',
        card: true,
        headerName: 'Criticidad',
        width: 150,
        renderCell: ({ row }) => <Badge label={labelOf(FLEET_TASK_CRITICALITY, row.criticality)} />,
      },
      {
        field: 'carType',
        card: true,
        headerName: 'Tipo de vehículo',
        width: 150,
        renderCell: ({ row }) => <span className="text-ink">{row.carType ?? 'Todos'}</span>,
      },
      {
        field: 'isActive',
        headerName: 'Estado',
        width: 110,
        renderCell: ({ row }) => (
          <Badge label={row.isActive ? { text: 'Activo', tone: 'success' } : { text: 'Inactivo', tone: 'neutral' }} />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 136,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={row.name}
            onView={() => navigate(`/fleet/plans/${row.planId}`, { state: FROM_LIST_STATE })}
            onEdit={canWrite ? () => setForm({ open: true, plan: row }) : undefined}
            actions={
              canWrite
                ? [
                    row.isActive
                      ? { label: 'Desactivar', icon: PowerOff, tone: 'danger', onClick: () => void handleToggle(row) }
                      : { label: 'Activar', icon: Power, onClick: () => void handleToggle(row) },
                  ]
                : []
            }
          />
        ),
      },
    ],
    [canWrite, handleToggle, navigate],
  );

  return (
    <PageContainer stack>
      <PageHeader
        title="Planes de flota"
        description="Las reglas de mantenimiento y habilitación: cada una dispara sus propias tareas (CU-105/140)."
        actions={
          <Button
            icon={<CirclePlus />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => setForm({ open: true, plan: null })}
          >
            Nuevo plan
          </Button>
        }
      />

      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus planes."
          />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-outline p-4 sm:flex-row sm:items-end">
            <Select
              label="Aplica a"
              options={SUBJECT_FILTER_OPTIONS}
              className="w-48"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Select
              label="Estado"
              options={STATUS_FILTER_OPTIONS}
              className="w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          {error ? (
            <div className="p-4">
              <ErrorState error={error} resource="Los planes" onRetry={() => void refetch()} />
            </div>
          ) : (
            <DataTable
              rows={data ?? []}
              columns={columns}
              getRowId={(row) => row.planId}
              loading={isPending}
              onRowClick={(row) => navigate(`/fleet/plans/${row.planId}`, { state: FROM_LIST_STATE })}
              empty={
                <EmptyState title="Sin planes" description="Creá el primero para empezar a generar tareas de flota." />
              }
            />
          )}
        </Card>
      )}

      <FleetPlanFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        plan={form.open ? form.plan : null}
      />
    </PageContainer>
  );
};
