import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Form,
  FormInput,
  FormSelect,
  LoadingState,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { useUrlParam } from '../../hooks';
import { errorMessage } from '../../services/api/errors';
import type { ScheduledTasksConfig } from '../../services/api/types';
import { useCompanyScheduledTasks, useUpdateCompanyScheduledTasks } from '../../services/queries/platformConsole';
import { notify } from '../../utils/notifications';
import { SettingsMeta } from '../Configuration/components/SettingsMeta';
import { StaleConfigNotice } from '../Configuration/components/StaleConfigNotice';
import {
  TASKS,
  UNIT_LABELS,
  formatInterval,
  intervalsSchema,
  toIntervalsBody,
  toIntervalsValues,
  type IntervalsFormValues,
  type Unit,
} from '../Configuration/scheduledTasksRules';
import { useConfigSync } from '../Configuration/useConfigSync';
import { CompanySelect } from './components/CompanySelect';

const UNIT_OPTIONS = (Object.keys(UNIT_LABELS) as Unit[]).map((unit) => ({ value: unit, label: UNIT_LABELS[unit] }));

const pad = (hour: number) => String(hour).padStart(2, '0');

interface FormProps {
  companyId: string;
  config: ScheduledTasksConfig;
}

/** Las cuatro frecuencias de una empresa; la hora del aviso de flota es de la empresa y acá sólo se ve. */
const IntervalsForm = ({ companyId, config }: FormProps) => {
  const update = useUpdateCompanyScheduledTasks();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<IntervalsFormValues>({
    resolver: zodResolver(intervalsSchema),
    mode: 'onChange',
    defaultValues: toIntervalsValues(config),
  });
  const {
    reset,
    formState: { isDirty, isValid },
  } = methods;

  const load = useCallback((next: ScheduledTasksConfig) => reset(toIntervalsValues(next)), [reset]);
  const { stale, adopt, acceptStale } = useConfigSync({ config, isDirty, load });

  const submit = (values: IntervalsFormValues) => {
    setServerError(null);
    update.mutate(
      { id: companyId, body: toIntervalsBody(values) },
      {
        onSuccess: (saved) => {
          adopt(saved);
          notify.success('Frecuencias guardadas');
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    );
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
          title="Cada cuánto corre cada tarea"
          subtitle="El intervalo tiene que ser múltiplo del ritmo base de la tarea y no puede superar las 24 horas (los reintentos del despacho, 5 minutos). Rige desde el ciclo siguiente."
          className="mt-5"
        />
        <ul className="mt-4 divide-y divide-outline">
          {TASKS.map((task) => (
            <li key={task.field} className="py-4 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-ink">{task.label}</p>
              <p className="text-sm text-muted">{task.help}</p>
              <div className="mt-3 flex items-start gap-3">
                <div className="w-28 sm:w-32">
                  <FormInput
                    name={`intervals.${task.field}.amount`}
                    label="Cada"
                    type="number"
                    inputMode="decimal"
                    min={0}
                  />
                </div>
                <div className="w-32 sm:w-36">
                  <FormSelect
                    name={`intervals.${task.field}.unit`}
                    label="Unidad"
                    options={UNIT_OPTIONS}
                    registerOptions={{ deps: [`intervals.${task.field}.amount`] }}
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">Ritmo base: cada {formatInterval(task.tickSeconds)}.</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <CardHeader
          title="Aviso de vencimientos de flota"
          subtitle="La hora la elige la distribuidora desde su configuración: acá sólo se ve."
          className=""
        />
        <p className="mt-2 tabular-nums text-sm text-ink">{pad(config.fleetAlertHour)}:00 (hora de Argentina)</p>
      </Card>

      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" loading={update.isPending} disabled={!isValid || !isDirty}>
        Guardar cambios
      </Button>
    </Form>
  );
};

const CompanyTasks = ({ companyId }: { companyId: string }) => {
  const { data, isPending, error, refetch } = useCompanyScheduledTasks(companyId);
  if (error) return <ErrorState error={error} resource="La empresa" onRetry={() => void refetch()} />;
  if (isPending) return <LoadingState label="Cargando las tareas de la empresa…" />;
  return <IntervalsForm key={companyId} companyId={companyId} config={data} />;
};

/**
 * Tareas programadas por empresa (`GET/PUT /v2/platform/companies/:id/scheduled-tasks`): las frecuencias son de la
 * plataforma (costo y carga del servidor); la hora del aviso de flota la decide cada distribuidora.
 */
export const PlatformScheduledTasks = () => {
  const [companyId, setCompanyId] = useUrlParam('company', '');
  return (
    <PageContainer size="sm" stack>
      <PageHeader
        title="Tareas programadas"
        description="Cada cuánto el sistema reintenta el despacho, activa o vence reservas y pedidos sin pagar, por empresa."
      />
      <div className="w-full sm:w-80">
        <CompanySelect value={companyId} onChange={setCompanyId} placeholder="Elegí una empresa" />
      </div>
      {companyId ? (
        <CompanyTasks companyId={companyId} />
      ) : (
        <EmptyState title="Elegí una empresa" description="Las frecuencias se configuran para cada distribuidora." />
      )}
    </PageContainer>
  );
};
