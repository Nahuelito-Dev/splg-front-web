import { useState } from 'react';
import { Landmark } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  DayFilter,
  ErrorState,
  PageContainer,
  PageHeader,
  Select,
  Skeleton,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { CashCollectionSettings as Settings } from '../../services/api/types';
import { useCashBoxes } from '../../services/queries/finance';
import {
  useCashSettings,
  usePendingCollections,
  useSettlePendingCollections,
  useUpdateCashSettings,
} from '../../services/queries/cashSettings';
import { daysAgo } from '../../utils/dates';
import { formatDay } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { DistributorRequired } from '../Configuration/components/DistributorRequired';
import { boxesOf, canSettle, pendingSentence, settleSummary, toSettingsBody } from './collectionSettingsRules';

const NO_BOX = { value: '', label: 'Sin caja: los cobros quedan sin asentar' };

interface FormProps {
  settings: Settings;
  canWrite: boolean;
  writeHint?: string;
}

const SettingsForm = ({ settings, canWrite, writeHint }: FormProps) => {
  const wallets = useCashBoxes({ page: 0, pageSize: 100 }, { kind: 'wallet' });
  const update = useUpdateCashSettings();
  const saved = boxesOf(settings);
  const [values, setValues] = useState(saved);
  const dirty = values.mercadoPago !== saved.mercadoPago;

  const optionsOf = (query: typeof wallets) => [
    NO_BOX,
    ...(query.data?.data ?? []).map((b) => ({ value: b.cashBoxId, label: b.name })),
  ];

  const save = () =>
    update.mutate(toSettingsBody(values), {
      onSuccess: () => notify.success('Cajas de cobro guardadas'),
      onError: notify.error,
    });

  return (
    <Card className="p-6">
      <CardHeader
        title="Dónde entra lo cobrado"
        subtitle="Los pagos aprobados de Mercado Pago (menos su comisión) entran solos a esta caja. Sin caja, el cobro se confirma igual pero queda sin asentar."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Caja de Mercado Pago"
          value={values.mercadoPago}
          onChange={(e) => setValues({ ...values, mercadoPago: e.target.value })}
          options={optionsOf(wallets)}
          hint="Una billetera. Las devoluciones a clientes salen de la misma caja."
          disabled={!canWrite || wallets.isPending}
          title={writeHint}
        />
      </div>
      <p className="mt-4 text-sm text-muted">
        Elegir la caja no asienta cobros anteriores: eso lo pedís abajo, con la fecha desde la que querés.
      </p>
      <div className="mt-4">
        <Button loading={update.isPending} disabled={!canWrite || !dirty} title={writeHint} onClick={save}>
          Guardar cajas
        </Button>
      </div>
    </Card>
  );
};

const PendingCard = ({ settings, canWrite, writeHint }: FormProps) => {
  const [from, setFrom] = useState(() => daysAgo(30));
  const pending = usePendingCollections(from);
  const settle = useSettlePendingCollections();

  const run = async () => {
    if (!pending.data) return;
    const ok = await confirm({
      title: '¿Asentar los cobros pendientes?',
      text: `Se registran ${pending.data.count} ${pending.data.count === 1 ? 'movimiento' : 'movimientos'} en las cajas elegidas, con la fecha de hoy. Lo anterior al ${formatDay(from)} no se toca. Repetirlo no duplica nada. Si esos cobros de Mercado Pago ya los cargaste a mano en una caja, asentarlos hacia atrás los duplica.`,
      confirmText: 'Asentar cobros',
    });
    if (!ok) return;
    settle.mutate(
      { from },
      {
        onSuccess: (result) => {
          const summary = settleSummary(result);
          if (summary.complete) notify.success(summary.text);
          else notify.warn(summary.text);
        },
        onError: notify.error,
      },
    );
  };

  return (
    <Card className="p-6">
      <CardHeader
        title="Cobros sin asentar"
        subtitle="Cobros por Mercado Pago que no entraron a ninguna caja, por ejemplo porque todavía no habías elegido una."
      />
      <div className="flex flex-wrap items-end gap-4">
        <DayFilter label="Desde" value={from} onChange={(day) => day && setFrom(day)} maxDay={daysAgo(0)} />
        <Button
          icon={<Landmark className="h-4 w-4" aria-hidden="true" />}
          loading={settle.isPending}
          disabled={!canWrite || !pending.data || !canSettle(settings, pending.data)}
          title={writeHint}
          onClick={() => void run()}
        >
          Asentar cobros pendientes
        </Button>
      </div>
      <div className="mt-4" aria-live="polite">
        {pending.error ? (
          <ErrorState error={pending.error} resource="Los cobros pendientes" onRetry={() => void pending.refetch()} />
        ) : pending.isPending ? (
          <Skeleton className="h-5 w-2/3" />
        ) : (
          <p className="text-sm text-ink">{pendingSentence(pending.data, from)}</p>
        )}
      </div>
      {pending.data && pending.data.count > 0 && !canSettle(settings, pending.data) && (
        <p className="mt-2 text-sm text-muted">Elegí y guardá la caja de Mercado Pago para poder asentarlos.</p>
      )}
    </Card>
  );
};

/** Configuración de las cajas de cobro de las ventas y asiento de los cobros que quedaron afuera. */
export const CashCollectionSettings = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useCashSettings({ enabled: !needsDistributor });
  return (
    <PageContainer size="sm">
      <PageHeader title="Cajas de cobro" description="A qué caja entra lo que se cobra por Mercado Pago." />
      {needsDistributor ? (
        <DistributorRequired />
      ) : error ? (
        <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-6">
          <SettingsForm key={data.updatedAt ?? 'new'} settings={data} canWrite={canWrite} writeHint={writeHint} />
          <PendingCard settings={data} canWrite={canWrite} writeHint={writeHint} />
        </div>
      )}
    </PageContainer>
  );
};
