import { useMemo, useState } from 'react';
import { Download, Landmark, Scale, Wallet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DetailList,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  KpiCard,
  PageContainer,
  PageHeader,
  SelectionBar,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import type { MpReconciliationDetail } from '../../services/api/types';
import { useCashBoxOptions } from '../../services/queries/finance';
import { useCashSettings } from '../../services/queries/cashSettings';
import {
  useApplyMpReconciliation,
  useMpReconciliation,
  useMpReconciliationReport,
} from '../../services/queries/mpReconciliation';
import { formatCurrencyExact, formatDateTime, formatDay } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { MP_RECONCILIATION_STATUS, labelOf } from '../../utils/statusLabels';
import { openFileSource, saveFileSource } from '../../utils/fileSource';
import { DistributorRequired } from '../Configuration/components/DistributorRequired';
import { MpDifferenceGroup, type BoxOption } from './components/MpDifferenceGroup';
import {
  applySummary,
  countsOf,
  failureMessages,
  groupByKind,
  missingBoxes,
  toApplyBody,
} from './mpReconciliationRules';

const REPORT_FILENAME = (run: MpReconciliationDetail) => `mercadopago-liberaciones-${run.from}-${run.to}.csv`;

const Waiting = ({ run }: { run: MpReconciliationDetail }) => (
  <Card className="p-6" aria-live="polite">
    <CardHeader
      title="Esperando el reporte de Mercado Pago"
      subtitle="Mercado Pago arma el reporte de liberaciones de manera asincrónica; suele tardar unos minutos. La pantalla se actualiza sola y también podés volver más tarde: la conciliación queda en la lista."
    />
    <p className="text-sm text-ink">{run.statusNote ?? 'Todavía no se consultó.'}</p>
    <p className="mt-1 text-sm text-muted">
      {run.lastCheckedAt ? `Última consulta: ${formatDateTime(run.lastCheckedAt)}.` : ''}
    </p>
  </Card>
);

const Failed = ({ run, onBack }: { run: MpReconciliationDetail; onBack: () => void }) => (
  <Card className="p-6">
    <CardHeader title="No se pudo conciliar" subtitle={run.failureReason ?? 'Mercado Pago no entregó el reporte.'} />
    <Button variant="secondary" onClick={onBack}>
      Volver a la lista y pedirla de nuevo
    </Button>
  </Card>
);

const Summary = ({ run, canSeeAccount }: { run: MpReconciliationDetail; canSeeAccount: boolean }) => {
  const summary = run.summary;
  if (!summary) return null;
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Neto según Mercado Pago" icon={Landmark} value={formatCurrencyExact(summary.mp.net)} />
        <KpiCard title="Neto en la caja (mismo rango)" icon={Wallet} value={formatCurrencyExact(summary.cash.net)} />
        <KpiCard title="Diferencia de neto" icon={Scale} value={formatCurrencyExact(summary.netGap)} />
      </div>
      <p className="-mt-2 text-xs text-muted">
        La caja registra cada cobro el día que se aprobó y el reporte de Mercado Pago el día que se libera: en un rango
        corto el neto puede no coincidir sin que falte nada.
      </p>
      <Card className="p-5">
        <DetailList
          items={[
            { label: 'Cobros brutos (Mercado Pago)', value: formatCurrencyExact(summary.mp.gross) },
            { label: 'Comisiones', value: formatCurrencyExact(summary.mp.fees) },
            { label: 'Impuestos y retenciones', value: formatCurrencyExact(summary.mp.taxes) },
            { label: 'Ingresos de la caja', value: formatCurrencyExact(summary.cash.income) },
            { label: 'Egresos de la caja', value: formatCurrencyExact(summary.cash.expense) },
            { label: 'Ya asentadas antes', value: String(summary.alreadyApplied) },
            ...(summary.unreadableRows > 0
              ? [{ label: 'Filas ilegibles del archivo', value: String(summary.unreadableRows) }]
              : []),
            ...(canSeeAccount && summary.account
              ? [
                  {
                    label: 'Movimientos de la cuenta que no son de una distribuidora',
                    value: `${summary.account.rows} (créditos ${formatCurrencyExact(summary.account.credit)}, débitos ${formatCurrencyExact(summary.account.debit)})`,
                  },
                ]
              : []),
          ]}
        />
      </Card>
    </div>
  );
};

/** La ficha de una conciliación: lo que informa Mercado Pago frente a la caja, las diferencias y Aplicar. */
export const MpReconciliationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/finance/mp-reconciliation');
  const { needsDistributor, canWrite, writeHint, isSuperAdmin } = usePermissions();
  const { data: run, isPending, error, refetch } = useMpReconciliation(id, { enabled: !needsDistributor });
  useCrumbLeaf(run ? `${formatDay(run.from)} al ${formatDay(run.to)}` : undefined, goBack);
  const apply = useApplyMpReconciliation();
  const report = useMpReconciliationReport();

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [boxes, setBoxes] = useState<Record<string, string>>({});
  const [failures, setFailures] = useState<Record<string, string>>({});

  const items = useMemo(() => run?.items ?? [], [run]);
  const groups = useMemo(() => groupByKind(items), [items]);
  const counts = countsOf(items);
  const hasPayout = items.some((i) => i.needsCashBox && i.status === 'pending');
  const boxesQuery = useCashBoxOptions({ enabled: hasPayout && canWrite });
  const settings = useCashSettings({ enabled: hasPayout && canWrite });
  const boxOptions: BoxOption[] = (boxesQuery.data?.data ?? [])
    .filter((b) => b.cashBoxId !== settings.data?.mercadoPagoCashBoxId)
    .map((b) => ({ value: b.cashBoxId, label: b.name }));

  const toggle = (itemId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(itemId)) next.add(itemId);
      return next;
    });
  const toggleGroup = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const itemId of ids) {
        if (on) next.add(itemId);
        else next.delete(itemId);
      }
      return next;
    });

  const downloadReport = () => {
    if (!run) return;
    report.mutate(run.reconciliationId, {
      onSuccess: (link) => {
        const source = { kind: 'url', url: link.url, expiresAt: link.expiresAt } as const;
        if (!openFileSource(source)) saveFileSource(source, REPORT_FILENAME(run));
      },
      onError: notify.error,
    });
  };

  const runApply = async () => {
    if (!run) return;
    const missing = missingBoxes(items, selected, boxes);
    if (missing.length > 0) {
      notify.warn(
        `Elegí la caja de destino de ${missing.length === 1 ? 'el retiro marcado' : 'los retiros marcados'} antes de asentar.`,
      );
      return;
    }
    const body = toApplyBody(items, selected, boxes, run.distributorId);
    const ok = await confirm({
      title: '¿Asentar las diferencias elegidas?',
      text: `Se registran ${body.items.length} ${body.items.length === 1 ? 'ajuste' : 'ajustes'} en la caja de Mercado Pago, con la fecha de hoy. Cada diferencia se asienta una sola vez, aunque repitas la acción.`,
      confirmText: 'Asentar',
    });
    if (!ok) return;
    apply.mutate(
      { id: run.reconciliationId, body },
      {
        onSuccess: (result) => {
          const summary = applySummary(result);
          if (summary.complete) notify.success(summary.text);
          else notify.warn(summary.text);
          setFailures(failureMessages(result));
          // Lo asentado sale de la selección; lo que falló queda marcado para reintentar.
          setSelected(new Set(result.results.filter((r) => r.outcome === 'failed').map((r) => r.itemId)));
        },
        onError: notify.error,
      },
    );
  };

  return (
    <PageContainer size="md">
      <PageHeader
        title={
          run ? `Conciliación del ${formatDay(run.from)} al ${formatDay(run.to)}` : 'Conciliación con Mercado Pago'
        }
        eyebrow={run ? `Pedida el ${formatDateTime(run.createdAt)}` : undefined}
        badges={run && <Badge label={labelOf(MP_RECONCILIATION_STATUS, run.status)} />}
        actions={
          run?.hasReport && (
            <Button variant="secondary" icon={<Download />} loading={report.isPending} onClick={downloadReport}>
              Bajar el reporte
            </Button>
          )
        }
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : isPending ? (
        <DetailSkeleton />
      ) : error || !run ? (
        <ErrorState error={error} resource="La conciliación" onRetry={() => void refetch()} />
      ) : run.status === 'requested' ? (
        <Waiting run={run} />
      ) : run.status === 'failed' ? (
        <Failed run={run} onBack={() => navigate('/finance/mp-reconciliation')} />
      ) : (
        <div className="grid gap-6">
          <Summary run={run} canSeeAccount={isSuperAdmin} />
          {groups.length === 0 ? (
            <Card>
              <EmptyState
                icon={Scale}
                title="La caja coincide con Mercado Pago"
                description="No hay diferencias para asentar en este rango."
              />
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted" aria-live="polite">
                {counts.pending === 0
                  ? 'No queda nada por asentar en esta conciliación.'
                  : `Hay ${counts.pending} ${counts.pending === 1 ? 'diferencia' : 'diferencias'} por asentar. Marcá las que querés y apretá Asentar: nada se asienta solo.`}
              </p>
              <Card>
                <SelectionBar
                  count={selected.size}
                  noun={['diferencia', 'diferencias']}
                  onClear={() => setSelected(new Set())}
                  busy={apply.isPending}
                >
                  <Button
                    size="sm"
                    icon={<Wallet />}
                    disabled={!canWrite}
                    title={writeHint}
                    loading={apply.isPending}
                    onClick={() => void runApply()}
                  >
                    Asentar lo elegido
                  </Button>
                </SelectionBar>
                {selected.size === 0 && <p className="px-5 py-3 text-sm text-muted">Ninguna diferencia marcada.</p>}
              </Card>
              {groups.map((group) => (
                <MpDifferenceGroup
                  key={group.kind}
                  group={group}
                  selected={selected}
                  boxes={boxes}
                  boxOptions={boxOptions}
                  failures={failures}
                  disabled={!canWrite || apply.isPending}
                  onToggle={toggle}
                  onToggleGroup={toggleGroup}
                  onBox={(itemId, boxId) => setBoxes((prev) => ({ ...prev, [itemId]: boxId }))}
                />
              ))}
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
};
