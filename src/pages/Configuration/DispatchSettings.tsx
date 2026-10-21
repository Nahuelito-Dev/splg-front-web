import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, RotateCcw, X } from 'lucide-react';
import {
  Button,
  Card,
  ErrorState,
  IconButton,
  PageHeader,
  Skeleton,
  PageContainer,
  CardHeader,
  FormInput,
  Form,
  FormError,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { errorMessage } from '../../services/api/errors';
import type { DispatchConfig } from '../../services/api/types';
import { useDispatchConfig, useUpdateDispatchConfig } from '../../services/queries/moduleConfig';
import { confirm, notify } from '../../utils/notifications';
import { DistributorRequired } from './components/DistributorRequired';
import { SettingsMeta } from './components/SettingsMeta';
import { StaleConfigNotice } from './components/StaleConfigNotice';
import {
  OFFER_TTL_MAX_SECONDS,
  OFFER_TTL_MIN_SECONDS,
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
  RADIUS_STEPS_MAX,
  dispatchSchema,
  toDispatchBody,
  type DispatchFormValues,
} from './dispatchRules';
import { useConfigSync } from './useConfigSync';

interface FormProps {
  config: DispatchConfig;
  canWrite: boolean;
  writeHint?: string;
}

const valuesOf = (config: DispatchConfig): DispatchFormValues => ({
  steps: config.radiusStepsKm.map((km) => ({ value: String(km) })),
  ttl: String(config.offerTtlSeconds),
});

const DispatchForm = ({ config, canWrite, writeHint }: FormProps) => {
  const update = useUpdateDispatchConfig();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
    mode: 'onChange',
    defaultValues: valuesOf(config),
  });
  const {
    control,
    watch,
    trigger,
    getValues,
    reset,
    formState: { isDirty, isValid },
  } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });

  // Cada paso depende del anterior: al cambiar cualquiera se revalida todo el formulario.
  const snapshot = JSON.stringify(watch());
  useEffect(() => {
    void trigger();
  }, [snapshot, trigger]);

  const load = useCallback((next: DispatchConfig) => reset(valuesOf(next)), [reset]);
  const { stale, adopt, acceptStale } = useConfigSync({ config, isDirty, load });

  const addStep = () => {
    const raw = getValues('steps').at(-1)?.value ?? '';
    const last = Number(raw);
    const canGrow = raw.trim() !== '' && Number.isFinite(last) && last < RADIUS_MAX_KM;
    append({ value: canGrow ? String(Math.min(last + 5, RADIUS_MAX_KM)) : '' });
  };

  const submit = (values: DispatchFormValues) => {
    setServerError(null);
    update.mutate(toDispatchBody(values), {
      onSuccess: (saved) => {
        adopt(saved);
        notify.success('Parámetros del despacho guardados');
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  };

  const restoreDefaults = async () => {
    const ok = await confirm({
      title: '¿Restablecer los valores por defecto?',
      text: 'Se descartan los parámetros configurados y vuelven los de fábrica. Rigen para las ofertas que se creen desde ahora.',
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
    <Form methods={methods} onSubmit={submit} className="space-y-6">
      {stale && <StaleConfigNotice onAccept={acceptStale} />}
      <Card className="p-6">
        <SettingsMeta
          isDefault={config.isDefault}
          updatedAt={config.updatedAt}
          updatedByUserId={config.updatedByUserId}
        />

        <CardHeader
          title="Pasos de radio"
          subtitle={`Al llegar un pedido se busca primero al chofer más cercano dentro del primer radio. Si nadie lo acepta, se amplía la búsqueda al paso siguiente. Cada paso tiene que ser mayor que el anterior (${RADIUS_MIN_KM} a ${RADIUS_MAX_KM} km, hasta ${RADIUS_STEPS_MAX} pasos).`}
          className="mt-5"
        />
        <ol className="mt-4 space-y-3">
          {fields.map((field, index) => (
            <li key={field.id} className="flex items-start gap-3">
              <div className="w-48">
                <FormInput
                  name={`steps.${index}.value`}
                  label={`Paso ${index + 1} (km)`}
                  type="number"
                  inputMode="decimal"
                  min={RADIUS_MIN_KM}
                  max={RADIUS_MAX_KM}
                  disabled={!canWrite}
                />
              </div>
              <IconButton
                label={`Quitar el paso ${index + 1}`}
                icon={<X aria-hidden="true" />}
                className="mt-7"
                disabled={!canWrite || fields.length <= 1}
                onClick={() => remove(index)}
              />
            </li>
          ))}
        </ol>
        <FormError name="steps.root" />
        <FormError name="steps" />
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          disabled={!canWrite || fields.length >= RADIUS_STEPS_MAX}
          onClick={addStep}
        >
          Agregar paso
        </Button>
      </Card>

      <Card className="p-6">
        <CardHeader title="Tiempo para aceptar una oferta" className="" />
        <div className="mt-4 w-48">
          <FormInput
            name="ttl"
            label="Segundos"
            type="number"
            inputMode="numeric"
            min={OFFER_TTL_MIN_SECONDS}
            max={OFFER_TTL_MAX_SECONDS}
            disabled={!canWrite}
            hint={`${OFFER_TTL_MIN_SECONDS} a ${OFFER_TTL_MAX_SECONDS}`}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          Es lo que tiene cada chofer para aceptar el pedido antes de que se le ofrezca al siguiente. Los cambios rigen
          para las ofertas nuevas: las que ya se enviaron conservan su vencimiento.
        </p>
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
    </Form>
  );
};

export const DispatchSettings = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useDispatchConfig({ enabled: !needsDistributor });
  return (
    <PageContainer size="sm">
      <PageHeader
        title="Parámetros del despacho"
        description="Cómo se busca al chofer para cada pedido: hasta dónde se amplía el radio y cuánto tiempo tiene para aceptar."
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : error ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DispatchForm config={data} canWrite={canWrite} writeHint={writeHint} />
      )}
    </PageContainer>
  );
};
