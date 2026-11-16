import { PackageSearch, Play, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  PageContainer,
  PageHeader,
  Tabs,
  tabPanelProps,
  type TabItem,
} from '../../../common/components/ui';
import { usePermissions, useUrlParam } from '../../../hooks';
import { useRecoverySettings, useRunRecovery } from '../../../services/queries/recovery';
import { confirm, notify } from '../../../utils/notifications';
import { RecoveryCasesTab } from './RecoveryCasesTab';
import { RecoveryReportTab } from './RecoveryReportTab';
import { RecoverySettingsModal } from './RecoverySettingsModal';

const TABS_ID = 'recovery';
const TABS: TabItem[] = [
  { id: 'cases', label: 'Casos' },
  { id: 'report', label: 'Reporte de envases perdidos' },
];

/**
 * Recupero de envases (CU-108, módulo inteligente M5): detecta los envases que un cliente tiene pasada la tolerancia,
 * le manda un recordatorio y el aviso del depósito, le ofrece devolverlo en su próxima entrega y, agotados los avisos,
 * deja el legajo al administrador. El sistema nunca cobra ni da de baja por su cuenta.
 */
export const RecoveryCases = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const [tab, setTab] = useUrlParam('tab', 'cases');
  const [configuring, setConfiguring] = useState(false);
  const settings = useRecoverySettings({ enabled: configuring && !needsDistributor });
  const run = useRunRecovery();
  const active = tab === 'report' ? 'report' : 'cases';

  const handleRun = async () => {
    const ok = await confirm({
      title: '¿Correr el recupero ahora?',
      text: 'Detecta los envases que pasaron la tolerancia, abre sus casos y les manda los avisos a los clientes (un solo push por cliente, con todos sus envases). Sólo corre si el recupero está encendido en los parámetros. No cobra ni da de baja nada.',
      confirmText: 'Correr ahora',
    });
    if (!ok) return;
    run.mutate(undefined, {
      onSuccess: (r) =>
        notify.success(
          `Recupero corrido: ${r.opened} caso(s) nuevo(s), ${r.notices} aviso(s), ${r.escalated} escalado(s), ${r.lost} perdido(s)` +
            (r.manualReview > 0 ? `, ${r.manualReview} para revisión manual` : '') +
            (r.closedCoveredByOwned > 0
              ? `, ${r.closedCoveredByOwned} cerrado(s) porque el envase ya es del cliente`
              : ''),
        ),
      onError: notify.error,
    });
  };

  return (
    <PageContainer size="lg" stack>
      <PageHeader
        title="Recupero de envases"
        description="Los envases que los clientes no devolvieron a tiempo y la gestión de cada uno."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<SlidersHorizontal />}
              disabled={needsDistributor}
              loading={configuring && !settings.data && !settings.error}
              onClick={() => setConfiguring(true)}
            >
              Parámetros
            </Button>
            <Button
              icon={<Play />}
              loading={run.isPending}
              disabled={!canWrite}
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
            icon={PackageSearch}
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver su recupero de envases."
          />
        </Card>
      ) : (
        <Card>
          <Tabs items={TABS} value={active} onChange={setTab} label="Secciones del recupero" idPrefix={TABS_ID} />
          <div {...tabPanelProps(TABS_ID, active)} className="p-4">
            {active === 'cases' ? <RecoveryCasesTab /> : <RecoveryReportTab />}
          </div>
        </Card>
      )}
      {configuring && settings.data && (
        <RecoverySettingsModal
          config={settings.data}
          canWrite={canWrite}
          writeHint={writeHint}
          onClose={() => setConfiguring(false)}
        />
      )}
    </PageContainer>
  );
};
