import { BadgeCheck, Percent, Play, Repeat, SlidersHorizontal, Wallet, FlaskConical } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  PageContainer,
  PageHeader,
  Tabs,
  tabPanelProps,
  type TabItem,
} from '../../../common/components/ui';
import { usePermissions, useUrlParam } from '../../../hooks';
import type { RepurchaseRun } from '../../../services/api/types';
import { useProcessConfigs } from '../../../services/queries/moduleConfig';
import { useRepurchaseStats, useRunRepurchase, useSimulateRepurchase } from '../../../services/queries/repurchase';
import { formatCurrency } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { ProcessConfigModal } from '../../Configuration/components/ProcessConfigModal';
import { conversionText, runSummary } from './repurchaseLabels';
import { RepurchaseForecastTab } from './RepurchaseForecastTab';
import { RepurchaseInvitationsTab } from './RepurchaseInvitationsTab';
import { RepurchaseRunModal } from './RepurchaseRunModal';

const TABS_ID = 'repurchase';
const TABS: TabItem[] = [
  { id: 'forecast', label: 'Próximas recompras' },
  { id: 'invitations', label: 'Invitaciones' },
];

/**
 * Recompra anticipada (CU-106, módulo inteligente M3): el sistema estima cuándo se le acaba el gas a cada cliente,
 * lo invita a reponer con el pedido armado y registra cómo le fue. El administrador ve a quién se le acaba (CU-146),
 * las invitaciones y su conversión, y ajusta los parámetros del proceso (CU-172).
 */
export const Repurchase = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const [tab, setTab] = useUrlParam('tab', 'forecast');
  const active = tab === 'invitations' ? 'invitations' : 'forecast';
  const stats = useRepurchaseStats({ enabled: !needsDistributor });
  const run = useRunRepurchase();
  const simulate = useSimulateRepurchase();
  const running = run.isPending || simulate.isPending;
  const [configuring, setConfiguring] = useState(false);
  const [simulation, setSimulation] = useState<RepurchaseRun | null>(null);
  const processes = useProcessConfigs({ enabled: configuring && !needsDistributor });
  const config = processes.data?.find((p) => p.process === 'repurchase');

  const handleSimulate = () =>
    simulate.mutate(undefined, { onSuccess: (result) => setSimulation(result), onError: notify.error });

  const handleRun = async () => {
    const ok = await confirm({
      title: '¿Correr la anticipación ahora?',
      text: 'Se invita ahora a los clientes a los que se les acaba el gas y se les avisa por la app. Es lo mismo que hace el proceso diario.',
      confirmText: 'Correr ahora',
    });
    if (!ok) return;
    run.mutate(undefined, {
      onSuccess: (r) => notify.success(`Corrida lista: ${runSummary(r)}`),
      onError: notify.error,
    });
  };

  const s = stats.data;
  return (
    <PageContainer size="lg" stack>
      <PageHeader
        title="Recompra anticipada"
        description="A quién se le acaba el gas, las invitaciones a reponer y cuántas terminan en pedido."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<SlidersHorizontal />}
              disabled={needsDistributor}
              loading={configuring && !config && !processes.error}
              onClick={() => setConfiguring(true)}
            >
              Parámetros
            </Button>
            <Button
              variant="secondary"
              icon={<FlaskConical />}
              disabled={needsDistributor || running}
              loading={simulate.isPending}
              onClick={handleSimulate}
            >
              Simular
            </Button>
            <Button
              icon={<Play />}
              loading={run.isPending}
              disabled={!canWrite || running}
              title={writeHint}
              onClick={() => void handleRun()}
            >
              Correr ahora
            </Button>
          </>
        }
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            icon={Repeat}
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver su recompra anticipada."
          />
        </Card>
      ) : (
        <>
          {stats.error && !s ? (
            <ErrorState
              error={stats.error}
              resource="Los resultados de la recompra"
              onRetry={() => void stats.refetch()}
            />
          ) : (
            <section
              aria-label="Resultados de los últimos 90 días"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard
                title="Invitaciones"
                icon={Repeat}
                value={s ? String(s.sent) : '–'}
                loading={stats.isPending}
                hint="Últimos 90 días"
              />
              <KpiCard
                title="Aceptadas"
                icon={BadgeCheck}
                value={s ? String(s.accepted) : '–'}
                loading={stats.isPending}
                hint={s ? `${s.pending} abiertas` : undefined}
              />
              <KpiCard
                title="Conversión"
                icon={Percent}
                value={s ? conversionText(s.conversionRate) : '–'}
                loading={stats.isPending}
                hint="Aceptadas sobre las resueltas"
              />
              <KpiCard
                title="Vendido por invitación"
                icon={Wallet}
                value={s ? formatCurrency(s.acceptedRevenue) : '–'}
                loading={stats.isPending}
                hint="Pedidos de las aceptadas"
              />
            </section>
          )}
          <Card>
            <Tabs items={TABS} value={active} onChange={setTab} label="Secciones de la recompra" idPrefix={TABS_ID} />
            <div {...tabPanelProps(TABS_ID, active)} className="p-4">
              {active === 'forecast' ? <RepurchaseForecastTab /> : <RepurchaseInvitationsTab stats={s} />}
            </div>
          </Card>
        </>
      )}
      {configuring && processes.error && (
        <ErrorState
          error={processes.error}
          resource="Los parámetros de la recompra"
          onRetry={() => void processes.refetch()}
        />
      )}
      {configuring && processes.data && !config && (
        <ErrorState
          error={new Error('La API no devolvió el proceso de recompra')}
          resource="Los parámetros de la recompra"
          onRetry={() => void processes.refetch()}
        />
      )}
      {configuring && config && (
        <ProcessConfigModal
          key={`${config.process}|${config.updatedAt ?? 'none'}`}
          config={config}
          canWrite={canWrite}
          writeHint={writeHint}
          onClose={() => setConfiguring(false)}
        />
      )}
      {simulation && <RepurchaseRunModal result={simulation} onClose={() => setSimulation(null)} />}
    </PageContainer>
  );
};
