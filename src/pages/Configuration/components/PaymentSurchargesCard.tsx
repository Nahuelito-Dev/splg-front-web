import { zodResolver } from '@hookform/resolvers/zod';
import { Percent, RotateCcw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardHeader, ErrorState, Form, FormInput, Skeleton } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { errorMessage } from '../../../services/api/errors';
import type { PaymentSurchargeConfig } from '../../../services/api/types';
import { usePaymentSurcharges, useUpdatePaymentSurcharges } from '../../../services/queries/paymentSurcharges';
import { confirm, notify } from '../../../utils/notifications';
import {
  DEFAULT_SURCHARGES,
  SURCHARGE_MAX,
  SURCHARGE_MIN,
  paymentSurchargeSchema,
  toPaymentSurchargeBody,
  valuesOf,
  type PaymentSurchargeFormValues,
} from '../paymentSurchargeRules';
import { SettingsMeta } from './SettingsMeta';
import { StaleConfigNotice } from './StaleConfigNotice';
import { useConfigSync } from '../useConfigSync';

interface FormProps {
  config: PaymentSurchargeConfig;
  canWrite: boolean;
  writeHint?: string;
}

const PaymentSurchargesForm = ({ config, canWrite, writeHint }: FormProps) => {
  const update = useUpdatePaymentSurcharges();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<PaymentSurchargeFormValues>({
    resolver: zodResolver(paymentSurchargeSchema),
    mode: 'onChange',
    defaultValues: valuesOf(config),
  });
  const {
    reset,
    formState: { isDirty, isValid },
  } = methods;

  const load = useCallback((next: PaymentSurchargeConfig) => reset(valuesOf(next)), [reset]);
  const { stale, adopt, acceptStale } = useConfigSync({ config, isDirty, load });

  const submit = (values: PaymentSurchargeFormValues) => {
    setServerError(null);
    update.mutate(toPaymentSurchargeBody(values), {
      onSuccess: (saved) => {
        adopt(saved);
        notify.success('Recargos por medio de pago guardados');
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  };

  const restoreDefaults = async () => {
    const ok = await confirm({
      title: '¿Restablecer los valores por defecto?',
      text: 'Transferencia 10 %, Mercado Pago 10 % y efectivo 0 %. Rige para los pedidos que se coticen o creen desde ahora; los ya creados conservan su recargo.',
      confirmText: 'Restablecer',
    });
    if (!ok) return;
    setServerError(null);
    update.mutate(toPaymentSurchargeBody(DEFAULT_SURCHARGES), {
      onSuccess: (saved) => {
        adopt(saved);
        notify.success('Valores por defecto restablecidos');
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  };

  const rangeHint = `${SURCHARGE_MIN} a ${SURCHARGE_MAX} %, hasta 2 decimales`;

  return (
    <Form methods={methods} onSubmit={submit} className="mt-3 space-y-4">
      {stale && <StaleConfigNotice onAccept={acceptStale} />}
      <SettingsMeta
        isDefault={config.isDefault}
        updatedAt={config.updatedAt}
        updatedByUserId={config.updatedByUserId}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <FormInput
          name="transfer"
          label="Transferencia (%)"
          inputMode="decimal"
          autoComplete="off"
          disabled={!canWrite}
          hint={rangeHint}
        />
        <FormInput
          name="mercadoPago"
          label="Mercado Pago (%)"
          inputMode="decimal"
          autoComplete="off"
          disabled={!canWrite}
          hint={rangeHint}
        />
        <FormInput
          name="cash"
          label="Efectivo (%)"
          inputMode="decimal"
          autoComplete="off"
          disabled={!canWrite}
          hint={rangeHint}
        />
      </div>
      <p className="text-sm text-muted">
        Se suma al total del pedido (sobre los renglones más el recargo de zona); el cliente lo ve antes de confirmar.
        Rige para los pedidos que se coticen o creen desde ahora: los ya creados conservan el recargo con que se
        crearon.
      </p>
      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={update.isPending} disabled={!canWrite || !isValid || !isDirty} title={writeHint}>
          Guardar recargos
        </Button>
        <Button
          variant="secondary"
          icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          disabled={!canWrite || config.isDefault || update.isPending}
          title={writeHint}
          onClick={() => void restoreDefaults()}
        >
          Restablecer valores por defecto
        </Button>
      </div>
    </Form>
  );
};

/** Recargo por medio de pago de la distribuidora (`GET/PUT /v2/payment-surcharges`). */
export const PaymentSurchargesCard = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = usePaymentSurcharges({ enabled: !needsDistributor });

  return (
    <Card className="p-6">
      <CardHeader
        title="Recargos por medio de pago"
        icon={<Percent />}
        subtitle="Porcentaje que se suma al total del pedido según cómo paga el cliente: transferencia, Mercado Pago o efectivo."
        className=""
      />
      {needsDistributor ? (
        <p className="mt-2 text-sm text-muted">
          Elegí una distribuidora con «Ver como» para ver y cambiar los recargos.
        </p>
      ) : error ? (
        <ErrorState error={error} resource="Los recargos" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="mt-3 h-32 w-full" />
      ) : (
        <PaymentSurchargesForm config={data} canWrite={canWrite} writeHint={writeHint} />
      )}
    </Card>
  );
};
