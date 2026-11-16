import { Package } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, ErrorState, Skeleton, Switch } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { ContainerChargeConfig } from '../../../services/api/containerCharge';
import { errorMessage } from '../../../services/api/errors';
import { useContainerCharge, useUpdateContainerCharge } from '../../../services/queries/containerCharge';
import { useGasCylinderTypes } from '../../../services/queries/gasCylinders';
import { notify } from '../../../utils/notifications';

const SWITCH_LABEL = 'Cobrar los envases que le faltan al cliente';

/** Los tipos activos del catálogo sin precio de envase: con el cobro encendido, sus pedidos no se pueden tomar. */
const MissingContainerPrices = () => {
  const { data, error } = useGasCylinderTypes();
  if (error) {
    return (
      <p className="text-sm text-muted">
        No se pudo revisar si a algún tipo del catálogo le falta el precio de envase.
      </p>
    );
  }
  const missing = (data?.rows ?? []).filter((row) => row.isActive && row.container_price === null);
  if (missing.length === 0) return null;
  return (
    <div role="status" className="rounded-[10px] border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink">
      <p>
        Estos tipos no tienen precio de envase. Con el cobro encendido, los pedidos que necesiten envases de esos tipos
        no se van a poder tomar.
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {missing.map((row) => (
          <li key={row.gas_cylinder_id} className="rounded-full border border-outline bg-surface px-2.5 py-0.5">
            {row.type}
          </li>
        ))}
      </ul>
      <Link to="/cylinders" className="mt-2 inline-block font-semibold text-primary-strong hover:underline">
        Cargar los precios en el catálogo
      </Link>
    </div>
  );
};

interface FormProps {
  config: ContainerChargeConfig;
  canWrite: boolean;
  writeHint?: string;
}

const ContainerChargeForm = ({ config, canWrite, writeHint }: FormProps) => {
  const update = useUpdateContainerCharge();
  const [serverError, setServerError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const toggle = (next: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setServerError(null);
    update.mutate(
      { enabled: next },
      {
        onSuccess: (saved) =>
          notify.success(saved.enabled ? 'Ahora se cobran los envases que faltan' : 'Volvió el canje 1 a 1'),
        onError: (error) => setServerError(errorMessage(error)),
        onSettled: () => {
          inFlight.current = false;
        },
      },
    );
  };

  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{SWITCH_LABEL}</p>
          <p className="mt-1 text-sm text-muted">
            Encendido: si el cliente pide más garrafas que los envases que tiene, el pedido le cobra los que faltan al
            precio del catálogo. Apagado: canje 1 a 1, como siempre.
          </p>
        </div>
        <Switch
          label={SWITCH_LABEL}
          checked={config.enabled}
          disabled={!canWrite || update.isPending}
          title={writeHint}
          onChange={toggle}
        />
      </div>
      {update.isPending && (
        <p role="status" className="text-sm text-muted">
          Guardando…
        </p>
      )}
      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      {config.enabled && <MissingContainerPrices />}
    </div>
  );
};

/** F35: cobro de los envases que le faltan al cliente, por distribuidora (`GET/PUT /v2/container-charge`). */
export const ContainerChargeCard = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useContainerCharge({ enabled: !needsDistributor });

  return (
    <Card className="p-6">
      <CardHeader
        title="Cobro de envases"
        icon={<Package />}
        subtitle="Si el pedido cobra los envases que le faltan al cliente o sigue con el canje 1 a 1."
        className=""
      />
      {needsDistributor ? (
        <p className="mt-2 text-sm text-muted">
          Elegí una distribuidora con «Ver como» para ver y cambiar esta opción.
        </p>
      ) : error ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="mt-3 h-10 w-full" />
      ) : (
        <ContainerChargeForm config={data} canWrite={canWrite} writeHint={writeHint} />
      )}
    </Card>
  );
};
