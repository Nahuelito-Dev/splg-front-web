import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { RotateCcw } from 'lucide-react';
import {
  Button,
  Card,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  Switch,
  PageContainer,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { errorMessage } from '../../services/api/errors';
import type { ExpressConfig } from '../../services/api/types';
import { useExpressConfig, useUpdateExpressConfig } from '../../services/queries/moduleConfig';
import { confirm, notify } from '../../utils/notifications';
import { DistributorRequired } from './components/DistributorRequired';
import { SettingsMeta } from './components/SettingsMeta';
import { StaleConfigNotice } from './components/StaleConfigNotice';
import {
  OFFER_TTL_MAX_SECONDS,
  OFFER_TTL_MIN_SECONDS,
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
  expressSchema,
  toExpressBody,
  valuesOf,
  type ExpressFormValues,
} from './expressRules';
import { useConfigSync } from './useConfigSync';

interface FormProps {
  config: ExpressConfig;
  canWrite: boolean;
  writeHint?: string;
}

const ExpressForm = ({ config, canWrite, writeHint }: FormProps) => {
  const update = useUpdateExpressConfig();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<ExpressFormValues>({
    resolver: zodResolver(expressSchema),
    mode: 'onChange',
    defaultValues: valuesOf(config),
  });

  const load = useCallback((next: ExpressConfig) => reset(valuesOf(next)), [reset]);
  const { stale, adopt, acceptStale } = useConfigSync({ config, isDirty, load });

  const submit = handleSubmit((values) => {
    setServerError(null);
    update.mutate(toExpressBody(values), {
      onSuccess: (saved) => {
        adopt(saved);
        notify.success('Parámetros de la compra express guardados');
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  });

  const restoreDefaults = async () => {
    const ok = await confirm({
      title: '¿Restablecer los valores por defecto?',
      text: 'La modalidad express vuelve a quedar apagada. Rige para los pedidos que se coticen o creen desde ahora.',
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
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Ofrecer la compra express</h2>
            <p className="mt-1 text-sm text-muted">
              Entrega en moto con recargo. Se ofrece sólo con la dirección dentro de la cobertura, en horario de
              servicio y con un chofer en moto dentro del radio.
            </p>
          </div>
          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={field.onChange}
                label="Compra express habilitada"
                disabled={!canWrite}
                title={writeHint}
              />
            )}
          />
        </div>
      </Card>

      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <Input
          label="Recargo express ($)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          error={errors.surcharge?.message}
          disabled={!canWrite}
          hint="Se suma al final del total; si el pedido pasa al reparto común se descuenta."
          {...register('surcharge')}
        />
        <Input
          label="Radio máximo (km)"
          type="number"
          inputMode="decimal"
          min={RADIUS_MIN_KM}
          max={RADIUS_MAX_KM}
          error={errors.radius?.message}
          disabled={!canWrite}
          hint="Hasta dónde se busca una moto. No se amplía."
          {...register('radius')}
        />
        <Input
          label="Tiempo para aceptar (segundos)"
          type="number"
          inputMode="numeric"
          min={OFFER_TTL_MIN_SECONDS}
          max={OFFER_TTL_MAX_SECONDS}
          error={errors.ttl?.message}
          disabled={!canWrite}
          hint={`${OFFER_TTL_MIN_SECONDS} a ${OFFER_TTL_MAX_SECONDS}. Más corto que el despacho normal.`}
          {...register('ttl')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Desde" type="time" error={errors.from?.message} disabled={!canWrite} {...register('from')} />
          <Input label="Hasta" type="time" error={errors.to?.message} disabled={!canWrite} {...register('to')} />
        </div>
        <Input
          label="Tiempo estimado express (min)"
          type="number"
          inputMode="numeric"
          error={errors.estimated?.message}
          disabled={!canWrite}
          {...register('estimated')}
        />
        <Input
          label="Tiempo estimado reparto común (min)"
          type="number"
          inputMode="numeric"
          error={errors.standardEstimated?.message}
          disabled={!canWrite}
          {...register('standardEstimated')}
        />
        <p className="text-sm text-muted sm:col-span-2">
          El horario es hora argentina. Si ninguna moto acepta, el pedido pasa al reparto común sin el recargo y, si el
          cliente ya pagó en línea, se le devuelve esa parte.
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
    </form>
  );
};

export const ExpressSettings = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useExpressConfig({ enabled: !needsDistributor });
  return (
    <PageContainer size="sm">
      <PageHeader
        title="Compra express"
        description="Entrega en moto: recargo, radio de búsqueda, horario de servicio y tiempos estimados (CU-148 y CU-149)."
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : error ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <ExpressForm config={data} canWrite={canWrite} writeHint={writeHint} />
      )}
    </PageContainer>
  );
};
