import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Form,
  FormInput,
  PageContainer,
  PageHeader,
  Skeleton,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { errorMessage } from '../../services/api/errors';
import type { ScheduledTasksConfig } from '../../services/api/types';
import { useScheduledTasksConfig, useUpdateScheduledTasksConfig } from '../../services/queries/moduleConfig';
import { usePlatform } from '../../services/queries/supportSessions';
import { notify } from '../../utils/notifications';
import { DistributorRequired } from './components/DistributorRequired';
import { SettingsMeta } from './components/SettingsMeta';
import { StaleConfigNotice } from './components/StaleConfigNotice';
import {
  FLEET_ALERT_HOUR_MAX,
  TASKS,
  fleetAlertHourSchema,
  formatInterval,
  toFleetAlertHourBody,
  toFleetAlertHourValues,
  type FleetAlertHourFormValues,
} from './scheduledTasksRules';
import { useConfigSync } from './useConfigSync';

/** Las cuatro frecuencias: las ve la empresa, las cambia la plataforma. */
const Frequencies = ({ config }: { config: ScheduledTasksConfig }) => {
  const { data: platform } = usePlatform();
  return (
    <Card className="p-6">
      <CardHeader
        title="Cada cuánto corre cada tarea"
        subtitle={`Las fija ${platform?.name ?? 'la plataforma'}: son frecuencias del servidor, no se cambian desde la distribuidora.`}
        className=""
      />
      <dl className="mt-4 divide-y divide-outline">
        {TASKS.map((task) => (
          <div key={task.field} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
            <dt className="min-w-0">
              <p className="text-sm font-medium text-ink">{task.label}</p>
              <p className="text-sm text-muted">{task.help}</p>
            </dt>
            <dd className="whitespace-nowrap tabular-nums text-sm text-ink">
              cada {formatInterval(config[task.field])}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};

interface FormProps {
  config: ScheduledTasksConfig;
  canWrite: boolean;
  writeHint?: string;
}

/** La hora del aviso de vencimientos de flota: lo único que la empresa decide de sus tareas programadas. */
const FleetAlertHourForm = ({ config, canWrite, writeHint }: FormProps) => {
  const update = useUpdateScheduledTasksConfig();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<FleetAlertHourFormValues>({
    resolver: zodResolver(fleetAlertHourSchema),
    mode: 'onChange',
    defaultValues: toFleetAlertHourValues(config),
  });
  const {
    reset,
    formState: { isDirty, isValid },
  } = methods;

  const load = useCallback((next: ScheduledTasksConfig) => reset(toFleetAlertHourValues(next)), [reset]);
  const { stale, adopt, acceptStale } = useConfigSync({ config, isDirty, load });

  const submit = (values: FleetAlertHourFormValues) => {
    setServerError(null);
    update.mutate(toFleetAlertHourBody(values), {
      onSuccess: (saved) => {
        adopt(saved);
        notify.success('Hora del aviso guardada');
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  };

  return (
    <Form methods={methods} onSubmit={submit} className="space-y-6">
      {stale && <StaleConfigNotice onAccept={acceptStale} />}
      <Card className="p-6">
        <SettingsMeta
          isDefault={config.isDefault}
          updatedAt={config.updatedAt}
          updatedByUserId={config.updatedByUserId}
        />
        <CardHeader
          title="Aviso de vencimientos de flota"
          subtitle="La hora del día (hora de Argentina) en que se avisa a la distribuidora de los vencimientos de la flota. Una vez por día."
          className="mt-5"
        />
        <div className="mt-4 w-48">
          <FormInput
            name="hour"
            label="Hora (0 a 23)"
            type="number"
            inputMode="numeric"
            min={0}
            max={FLEET_ALERT_HOUR_MAX}
            disabled={!canWrite}
          />
        </div>
      </Card>

      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" loading={update.isPending} disabled={!canWrite || !isValid || !isDirty} title={writeHint}>
        Guardar cambios
      </Button>
    </Form>
  );
};

export const ScheduledTasksSettings = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useScheduledTasksConfig({ enabled: !needsDistributor });
  return (
    <PageContainer size="sm">
      <PageHeader
        title="Tareas programadas"
        description="Cada cuánto el sistema reintenta el despacho, activa o vence reservas y pedidos sin pagar, y a qué hora avisa de la flota."
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : error ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-6">
          <FleetAlertHourForm config={data} canWrite={canWrite} writeHint={writeHint} />
          <Frequencies config={data} />
        </div>
      )}
    </PageContainer>
  );
};
