import { useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useThresholds, useUpsertThresholds, useWarehouses } from '../../services/queries/stock';
import { notify } from '../../utils/notifications';
import { useCylinderOptions } from './components/useStockOptions';
import { changedThresholds, thresholdCellKey } from './stockMath';

/** Mínimos de llenas por galpón y tipo de garrafa. Un mínimo en 0 desactiva el aviso de ese par. */
export const Thresholds = () => {
  const { canWrite, writeHint } = usePermissions();
  const warehouses = useWarehouses(false);
  const cylinders = useCylinderOptions();
  const thresholds = useThresholds();
  const save = useUpsertThresholds();
  const [edits, setEdits] = useState<Record<string, string>>({});

  const failed = warehouses.isError || cylinders.failed || thresholds.isError;
  const loading = warehouses.isPending || cylinders.loading || thresholds.isPending;
  const error = warehouses.error ?? cylinders.error ?? thresholds.error;
  const retry = () => {
    void warehouses.refetch();
    void cylinders.refetch();
    void thresholds.refetch();
  };
  const current = new Map((thresholds.data ?? []).map((t) => [thresholdCellKey(t.warehouseId, t.gasCylinderId), t]));
  const changes = changedThresholds(edits, current);
  const invalid = Object.values(edits).some((v) => v !== '' && !/^\d{1,6}$/.test(v));

  const submit = () =>
    save.mutate(
      { thresholds: changes },
      {
        onSuccess: () => {
          notify.success('Mínimos guardados');
          setEdits({});
        },
        onError: notify.error,
      },
    );

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Mínimos de stock"
        description="Cuántas llenas tiene que haber como mínimo en cada galpón. Si bajan de ahí, el sistema avisa a los administradores."
        actions={
          <Button
            icon={<Save />}
            disabled={!canWrite || changes.length === 0 || invalid}
            title={writeHint}
            loading={save.isPending}
            onClick={submit}
          >
            Guardar mínimos
          </Button>
        }
      />
      {failed ? (
        <Card>
          <ErrorState error={error} resource="Los mínimos" onRetry={retry} />
        </Card>
      ) : loading ? (
        <Card className="p-4">
          <Skeleton className="h-32 w-full" />
        </Card>
      ) : (warehouses.data ?? []).length === 0 || cylinders.options.length === 0 ? (
        <Card>
          <EmptyState
            title="Faltan galpones o garrafas"
            description="Cargá al menos un galpón y una garrafa del catálogo."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {(warehouses.data ?? []).map((warehouse) => (
            <Card key={warehouse.warehouseId}>
              <h2 className="border-b border-outline px-4 py-3 text-sm font-semibold text-ink">{warehouse.name}</h2>
              <ul className="divide-y divide-outline">
                {cylinders.options.map((cylinder) => {
                  const key = thresholdCellKey(warehouse.warehouseId, cylinder.value);
                  const existing = current.get(key);
                  const low = existing && existing.minFull > 0 && existing.currentFull < existing.minFull;
                  return (
                    <li key={key} className="grid grid-cols-1 items-center gap-3 p-4 sm:grid-cols-[1fr_auto_160px]">
                      <span className="font-semibold text-ink">{cylinder.label}</span>
                      <span className="flex items-center gap-2 text-sm text-muted">
                        {existing ? `${existing.currentFull} llenas ahora` : 'Sin mínimo definido'}
                        {low && <Badge label={{ text: 'Stock bajo', tone: 'warn' }} className="[&]:gap-1" />}
                        {low && <AlertTriangle aria-hidden="true" className="h-4 w-4 text-warn" />}
                      </span>
                      <Input
                        label={`Mínimo de llenas de ${cylinder.label} en ${warehouse.name}`}
                        type="number"
                        min={0}
                        disabled={!canWrite}
                        value={edits[key] ?? String(existing?.minFull ?? 0)}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                        error={
                          edits[key] !== undefined && !/^\d{1,6}$/.test(edits[key])
                            ? 'Número entero, 0 o más'
                            : undefined
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
