import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Card, CardHeader, ErrorState, Form, FormInput, Skeleton } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { errorMessage } from '../../../services/api/errors';
import type { MercadoPagoCredentials } from '../../../services/api/types';
import {
  useDeactivateMercadoPagoCredentials,
  useMercadoPagoCredentials,
  useSaveMercadoPagoCredentials,
} from '../../../services/queries/mercadoPagoCredentials';
import { confirm, notify } from '../../../utils/notifications';
import {
  emptyMercadoPagoValues,
  mercadoPagoSchema,
  toMercadoPagoBody,
  type MercadoPagoFormValues,
} from '../mercadoPagoRules';

interface Props {
  credentials: MercadoPagoCredentials;
  canWrite: boolean;
  writeHint?: string;
}

const MaskedValue = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="break-all font-mono text-sm text-ink">{value ?? '—'}</dd>
  </div>
);

const MercadoPagoPanel = ({ credentials, canWrite, writeHint }: Props) => {
  const save = useSaveMercadoPagoCredentials();
  const deactivate = useDeactivateMercadoPagoCredentials();
  const [serverError, setServerError] = useState<string | null>(null);
  const own = credentials.source === 'own';
  const methods = useForm<MercadoPagoFormValues>({
    resolver: zodResolver(mercadoPagoSchema),
    mode: 'onChange',
    defaultValues: emptyMercadoPagoValues,
  });
  const {
    reset,
    formState: { isValid },
  } = methods;
  const disabled = !canWrite || !credentials.encryptionConfigured;

  const submit = (values: MercadoPagoFormValues) => {
    setServerError(null);
    save.mutate(toMercadoPagoBody(values), {
      onSuccess: () => {
        reset(emptyMercadoPagoValues);
        notify.success('Cuenta de Mercado Pago guardada');
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  };

  const turnOff = async () => {
    const ok = await confirm({
      title: '¿Volver a la cuenta del sistema?',
      text: 'Los cobros, devoluciones y la conciliación de esta distribuidora pasan a usar la cuenta del sistema. Las credenciales cargadas se desactivan; podés cargarlas de nuevo cuando quieras.',
      confirmText: 'Desactivar cuenta propia',
      danger: true,
    });
    if (!ok) return;
    deactivate.mutate(undefined, {
      onSuccess: () => notify.success('Se cobra con la cuenta del sistema'),
      onError: notify.error,
    });
  };

  return (
    <div className="mt-3 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          label={own ? { text: 'Cuenta propia', tone: 'success' } : { text: 'Cuenta del sistema', tone: 'neutral' }}
        />
        {own && credentials.verifiedAt && (
          <span className="text-xs text-muted">
            Verificada el {new Date(credentials.verifiedAt).toLocaleString('es-AR')}
          </span>
        )}
      </div>
      <p className="text-sm text-muted">
        {own
          ? 'Los cobros, devoluciones, avisos de pago y la conciliación de esta distribuidora usan su cuenta de Mercado Pago.'
          : 'Mientras no cargues una cuenta propia, los cobros se hacen con la cuenta del sistema. Al cargarla, pasan a ir a tu cuenta.'}
      </p>
      {own && (
        <dl className="grid gap-3 sm:grid-cols-3">
          <MaskedValue label="Access token" value={credentials.accessTokenMasked} />
          <MaskedValue label="Clave pública" value={credentials.publicKeyMasked} />
          <MaskedValue label="Secreto del webhook" value={credentials.webhookSecretMasked} />
        </dl>
      )}
      {!credentials.encryptionConfigured && (
        <p role="alert" className="text-sm text-danger">
          El servidor no tiene habilitadas las cuentas propias (falta la clave de cifrado). Avisale a quien administra
          el sistema.
        </p>
      )}
      <Form methods={methods} onSubmit={submit} className="space-y-4">
        <p className="text-sm font-medium text-ink">{own ? 'Reemplazar la cuenta' : 'Cargar una cuenta propia'}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormInput
              name="accessToken"
              label="Access token"
              type="password"
              autoComplete="new-password"
              disabled={disabled}
              hint="Se verifica con Mercado Pago antes de guardarlo"
            />
          </div>
          <FormInput
            name="publicKey"
            label="Clave pública"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
          />
          <FormInput
            name="webhookSecret"
            label="Secreto del webhook"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
          />
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={save.isPending} disabled={disabled || !isValid} title={writeHint}>
            {own ? 'Reemplazar cuenta' : 'Guardar cuenta'}
          </Button>
          {own && (
            <Button
              type="button"
              variant="secondary"
              loading={deactivate.isPending}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => void turnOff()}
            >
              Volver a la cuenta del sistema
            </Button>
          )}
        </div>
      </Form>
    </div>
  );
};

/** Cuenta de Mercado Pago de la distribuidora (`/v2/distributor/mercadopago-credentials`). Nunca muestra valores en claro. */
export const MercadoPagoCard = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useMercadoPagoCredentials({ enabled: !needsDistributor });

  return (
    <Card className="p-6">
      <CardHeader
        title="Mercado Pago"
        icon={<CreditCard />}
        subtitle="La cuenta con la que se cobran los pedidos pagados online."
        className=""
      />
      {needsDistributor ? (
        <p className="mt-2 text-sm text-muted">
          Elegí una distribuidora con «Ver como» para ver y cambiar su cuenta de Mercado Pago.
        </p>
      ) : error ? (
        <ErrorState error={error} resource="La cuenta de Mercado Pago" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="mt-3 h-40 w-full" />
      ) : (
        <MercadoPagoPanel credentials={data} canWrite={canWrite} writeHint={writeHint} />
      )}
    </Card>
  );
};
