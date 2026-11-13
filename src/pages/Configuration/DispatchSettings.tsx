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
import { useDispatchConfig, useUpdateDispatchConfig } from '../../services/queries/moduleConfig';
import { confirm, notify } from '../../utils/notifications';
import { DistributorRequired } from './components/DistributorRequired';
import { SettingsMeta } from './components/SettingsMeta';
import { StaleConfigNotice } from './components/StaleConfigNotice';
import {
  ARRIVAL_RADIUS_DEFAULT_METERS,
  ARRIVAL_RADIUS_MAX_METERS,
  ARRIVAL_RADIUS_MIN_METERS,
  FINISHING_RADIUS_MAX_METERS,
  FINISHING_RADIUS_MIN_METERS,
  NO_DRIVER_EXPIRY_MAX_MINUTES,
  NO_DRIVER_EXPIRY_MIN_MINUTES,
  OFFER_TTL_MAX_SECONDS,
  OFFER_TTL_MIN_SECONDS,
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
  RADIUS_STEPS_MAX,
  dispatchSchema,
  toDispatchBody,
  toDispatchValues,
  type DispatchFormValues,
  type DispatchSettingsConfig,
} from './dispatchRules';
import { useConfigSync } from './useConfigSync';

interface FormProps {
  config: DispatchSettingsConfig;
  canWrite: boolean;
  writeHint?: string;
}

const DispatchForm = ({ config, canWrite, writeHint }: FormProps) => {
  const update = useUpdateDispatchConfig();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
    mode: 'onChange',
    defaultValues: toDispatchValues(config),
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

  const load = useCallback((next: DispatchSettingsConfig) => reset(toDispatchValues(next)), [reset]);
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

      <Card className="p-6">
        <CardHeader title="Choferes por terminar su entrega" className="" />
        <div className="mt-4 w-48">
          <FormInput
            name="finishing"
            label="Metros al destino"
            type="number"
            inputMode="numeric"
            min={FINISHING_RADIUS_MIN_METERS}
            max={FINISHING_RADIUS_MAX_METERS}
            disabled={!canWrite}
            hint={`${FINISHING_RADIUS_MIN_METERS} a ${FINISHING_RADIUS_MAX_METERS}. Con 0 se apaga`}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          Un chofer que lleva un solo pedido en camino y está a esta distancia o menos del punto de entrega (según su
          ubicación de los últimos 2 minutos) también puede recibir una oferta: acepta un pedido más y lo hace cuando
          termine el actual. El sistema no le ofrece un segundo pedido en espera; el administrador sí puede asignarle
          más. Con 0, sólo se ofrece a choferes sin pedido en curso. Dentro de cada radio de búsqueda se ofrece primero
          a los choferes libres y después a los que están por terminar.
        </p>
      </Card>

      <Card className="p-6">
        <CardHeader title="Pedidos sin chofer" className="" />
        <div className="mt-4 w-48">
          <FormInput
            name="expiry"
            label="Vencimiento de pedidos sin chofer (minutos)"
            type="number"
            inputMode="numeric"
            min={NO_DRIVER_EXPIRY_MIN_MINUTES}
            max={NO_DRIVER_EXPIRY_MAX_MINUTES}
            disabled={!canWrite}
            hint={`${NO_DRIVER_EXPIRY_MIN_MINUTES} a ${NO_DRIVER_EXPIRY_MAX_MINUTES}`}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          Es lo que un pedido pendiente espera que lo tome un chofer antes de que el sistema lo cancele. Corre desde que
          el pedido se puede ofrecer y, si está agendado, nunca antes del inicio de su franja. No corre mientras espera
          un pago online ni para los pedidos express.
        </p>
      </Card>

      <Card className="p-6">
        <CardHeader title="Control de llegada del chofer" className="" />
        <div className="mt-4 w-48">
          <FormInput
            name="arrival"
            label="Radio para marcar «Llegué» (metros)"
            type="number"
            inputMode="numeric"
            min={ARRIVAL_RADIUS_MIN_METERS}
            max={ARRIVAL_RADIUS_MAX_METERS}
            disabled={!canWrite}
            hint={`${ARRIVAL_RADIUS_MIN_METERS} a ${ARRIVAL_RADIUS_MAX_METERS}. Con 0 no se controla`}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          El chofer sólo puede marcar «Llegué» si está a esta distancia o menos del punto de entrega. Con 0 se apaga el
          control de distancia. Por omisión, {ARRIVAL_RADIUS_DEFAULT_METERS} metros.
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
        description="Cómo se busca al chofer para cada pedido: hasta dónde se amplía el radio, cuánto tiempo tiene para aceptar, si se ofrece a quien está por terminar otra entrega, cuánto espera un pedido sin chofer y desde qué distancia se puede marcar «Llegué»."
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
