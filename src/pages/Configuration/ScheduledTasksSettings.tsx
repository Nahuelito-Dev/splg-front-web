import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RotateCcw } from 'lucide-react';
import {
  Button,
  Card,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  PageContainer,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { errorMessage } from '../../services/api/errors';
import type { ScheduledTasksConfig } from '../../services/api/types';
import { useScheduledTasksConfig, useUpdateScheduledTasksConfig } from '../../services/queries/moduleConfig';
import { confirm, notify } from '../../utils/notifications';
import { DistributorRequired } from './components/DistributorRequired';
import { SettingsMeta } from './components/SettingsMeta';
import { StaleConfigNotice } from './components/StaleConfigNotice';
import {
  FLEET_ALERT_HOUR_MAX,
  TASKS,
  UNIT_LABELS,
  formatInterval,
  scheduledTasksSchema,
  toScheduledTasksBody,
  toScheduledTasksValues,
  type ScheduledTasksFormValues,
  type Unit,
} from './scheduledTasksRules';
import { useConfigSync } from './useConfigSync';

const UNIT_OPTIONS = (Object.keys(UNIT_LABELS) as Unit[]).map((unit) => ({ value: unit, label: UNIT_LABELS[unit] }));

interface FormProps {
  config: ScheduledTasksConfig;
  canWrite: boolean;
  writeHint?: string;
}

const ScheduledTasksForm = ({ config, canWrite, writeHint }: FormProps) => {
  const update = useUpdateScheduledTasksConfig();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<ScheduledTasksFormValues>({
    resolver: zodResolver(scheduledTasksSchema),
    mode: 'onChange',
    defaultValues: toScheduledTasksValues(config),
  });

  const load = useCallback((next: ScheduledTasksConfig) => reset(toScheduledTasksValues(next)), [reset]);
  const { stale, adopt, acceptStale } = useConfigSync({ config, isDirty, load });

  const submit = handleSubmit((values) => {
    setServerError(null);
    update.mutate(toScheduledTasksBody(values), {
      onSuccess: (saved) => {
        adopt(saved);
        notify.success('Tareas programadas guardadas');
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  });

  const restoreDefaults = async () => {
    const ok = await confirm({
      title: '¿Restablecer los valores por defecto?',
      text: 'Se descartan los intervalos configurados y vuelven los de fábrica. Rigen desde el ciclo siguiente.',
      confirmText: 'Restablecer',
    });
    if (!ok) return;
    setServerError(null);
    update.mutate(
      {},
      {
        onSuccess: (saved) => {
          adopt(saved);
          notify.success('Valores por defecto restablecidos');
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    );
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-6">
      {stale && <StaleConfigNotice onAccept={acceptStale} />}
      <Card className="p-6">
        <SettingsMeta
          isDefault={config.isDefault}
          updatedAt={config.updatedAt}
          updatedByUserId={config.updatedByUserId}
        />
        <h2 className="mt-5 text-base font-semibold text-ink">Cada cuánto corre cada tarea</h2>
        <p className="mt-1 text-sm text-muted">
          El intervalo tiene que ser múltiplo del ritmo base de la tarea y no puede superar las 24 horas (los reintentos
          del despacho, 5 minutos). Al guardar, el intervalo nuevo rige desde el ciclo siguiente.
        </p>
        <ul className="mt-4 divide-y divide-outline">
          {TASKS.map((task) => (
            <li key={task.field} className="py-4 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-ink">{task.label}</p>
              <p className="text-sm text-muted">{task.help}</p>
              <div className="mt-3 flex items-start gap-3">
                <div className="w-32">
                  <Input
                    label="Cada"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    error={errors.intervals?.[task.field]?.amount?.message}
                    disabled={!canWrite}
                    {...register(`intervals.${task.field}.amount`)}
                  />
                </div>
                <div className="w-36">
                  <Select
                    label="Unidad"
                    options={UNIT_OPTIONS}
                    disabled={!canWrite}
                    {...register(`intervals.${task.field}.unit`, { deps: [`intervals.${task.field}.amount`] })}
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">Ritmo base: cada {formatInterval(task.tickSeconds)}.</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Aviso de vencimientos de flota</h2>
        <p className="mt-1 text-sm text-muted">
          La hora del día (hora de Argentina) en que se avisa a la distribuidora de los vencimientos de la flota. Una
          vez por día.
        </p>
        <div className="mt-4 w-48">
          <Input
            label="Hora (0 a 23)"
            type="number"
            inputMode="numeric"
            min={0}
            max={FLEET_ALERT_HOUR_MAX}
            error={errors.hour?.message}
            disabled={!canWrite}
            {...register('hour')}
          />
        </div>
      </Card>

      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={update.isPending} disabled={!canWrite || !isValid || !isDirty} title={writeHint}>
          Guardar cambios
        </Button>
        <Button
          variant="secondary"
          icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          disabled={!canWrite || config.isDefault || update.isPending}
          onClick={() => void restoreDefaults()}
        >
          Restablecer valores por defecto
        </Button>
      </div>
    </form>
  );
};

export const ScheduledTasksSettings = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useScheduledTasksConfig({ enabled: !needsDistributor });
  return (
    <PageContainer size="sm">
      <PageHeader
        title="Tareas programadas"
        description="Cada cuánto el sistema reintenta el despacho, activa o vence reservas y pedidos sin pagar, y avisa de la flota."
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : error ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <ScheduledTasksForm config={data} canWrite={canWrite} writeHint={writeHint} />
      )}
    </PageContainer>
  );
};
