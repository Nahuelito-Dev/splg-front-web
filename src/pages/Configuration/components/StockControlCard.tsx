import { Card, ErrorState, Skeleton, Switch, CardHeader } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useStockControlSettings, useUpdateStockControlSettings } from '../../../services/queries/truckLoads';
import { confirm, notify } from '../../../utils/notifications';

/**
 * D5: «Exigir carga abierta para despachar». Con el interruptor encendido un chofer solo recibe y acepta pedidos si
 * tiene la carga del día abierta y en ruta; apagado, los recibe como siempre (aunque con carga en ruta el stock igual
 * se controla). Se guarda en `module_config` (`stock_control.requireOpenTruckLoad`).
 */
export const StockControlCard = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useStockControlSettings({ enabled: !needsDistributor });
  const update = useUpdateStockControlSettings();

  const toggle = async (next: boolean) => {
    const ok = await confirm({
      title: next ? '¿Exigir la carga abierta?' : '¿Dejar de exigir la carga abierta?',
      text: next
        ? 'Desde ahora, un chofer sin su carga del día abierta y en ruta no podrá recibir ni aceptar pedidos.'
        : 'Los choferes volverán a recibir y aceptar pedidos sin tener una carga abierta.',
      confirmText: next ? 'Exigir carga' : 'Dejar de exigir',
    });
    if (!ok) return;
    update.mutate(
      { requireOpenTruckLoad: next },
      {
        onSuccess: () => notify.success(next ? 'Ahora se exige la carga abierta' : 'Ya no se exige la carga abierta'),
        onError: notify.error,
      },
    );
  };

  return (
    <Card className="p-6">
      <CardHeader title="Control de stock al despachar" className="" />
      {needsDistributor ? (
        <p className="mt-2 text-sm text-muted">
          Elegí una distribuidora con «Ver como» para ver y cambiar esta opción.
        </p>
      ) : error ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="mt-3 h-10 w-full" />
      ) : (
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p id="require-open-load-label" className="text-sm font-medium text-ink">
              Exigir carga abierta para despachar
            </p>
            <p className="mt-1 text-sm text-muted">
              Encendido: un chofer solo recibe y acepta pedidos si abrió la carga del día y su camión ya salió. Así cada
              entrega descuenta del stock que realmente lleva el camión. Apagado: los choferes reciben pedidos como
              siempre, con o sin carga; si tienen una carga abierta, igual rige que esté en ruta.
            </p>
          </div>
          <Switch
            label="Exigir carga abierta para despachar"
            checked={data.requireOpenTruckLoad}
            disabled={!canWrite || update.isPending}
            title={writeHint}
            onChange={(next) => void toggle(next)}
          />
        </div>
      )}
    </Card>
  );
};
