import { CalendarClock, Play, SlidersHorizontal } from 'lucide-react';
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
import { PredictionAccuracyCard } from '../../../common/components/PredictionAccuracyCard';
import { usePlannerAccuracy, usePlannerSettings, useRunPlanner } from '../../../services/queries/planner';
import { notify } from '../../../utils/notifications';
import { PlannerCasesTab } from './PlannerCasesTab';
import { PlannerForecastTab } from './PlannerForecastTab';
import { PlannerSettingsModal } from './PlannerSettingsModal';

const TABS_ID = 'planner';
const TABS: TabItem[] = [
  { id: 'cases', label: 'Casos' },
  { id: 'forecast', label: 'Próximos vencimientos' },
];

/**
 * Planificador de taller (CU-105, módulo inteligente M2): proyecta los vencimientos de la flota con el uso real de
 * cada vehículo, le propone al chofer una ventana de taller que no choque con la carga de pedidos y deja al
 * administrador lo que no se acordó. El administrador confirma el taller y el gasto.
 */
export const FleetPlanner = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const [tab, setTab] = useUrlParam('tab', 'cases');
  const [configuring, setConfiguring] = useState(false);
  const accuracy = usePlannerAccuracy({ enabled: !needsDistributor });
  const settings = usePlannerSettings({ enabled: configuring && !needsDistributor });
  const run = useRunPlanner();
  const active = tab === 'forecast' ? 'forecast' : 'cases';

  const handleRun = () =>
    run.mutate(undefined, {
      onSuccess: (r) =>
        notify.success(
          `Planificador corrido: ${r.proposals} propuesta(s) al chofer, ${r.escalated} escalada(s)` +
            (r.groundedVehicles > 0 ? `, ${r.groundedVehicles} vehículo(s) fuera de servicio` : ''),
        ),
      onError: notify.error,
    });

  return (
    <PageContainer size="lg" stack>
      <PageHeader
        title="Planificador de taller"
        description="Los vencimientos que se vienen y la ventana de taller acordada con cada chofer."
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
            <Button icon={<Play />} loading={run.isPending} disabled={!canWrite} title={writeHint} onClick={handleRun}>
              Correr ahora
            </Button>
          </>
        }
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            icon={CalendarClock}
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver su planificador de taller."
          />
        </Card>
      ) : (
        <>
          <PredictionAccuracyCard
            accuracy={accuracy.data?.accuracy}
            loading={accuracy.isPending}
            error={accuracy.error}
            onRetry={() => void accuracy.refetch()}
            subtitle="Qué tan cerca estuvo la fecha proyectada del vencimiento de cuando se hizo el trabajo, en los últimos 180 días"
            emptyHint="trabajos"
            tendencySubject="el trabajo se hace"
          />
          <Card>
            <Tabs items={TABS} value={active} onChange={setTab} label="Secciones del planificador" idPrefix={TABS_ID} />
            <div {...tabPanelProps(TABS_ID, active)} className="p-4">
              {active === 'cases' ? <PlannerCasesTab /> : <PlannerForecastTab />}
            </div>
          </Card>
        </>
      )}
      {configuring && settings.data && (
        <PlannerSettingsModal
          config={settings.data}
          canWrite={canWrite}
          writeHint={writeHint}
          onClose={() => setConfiguring(false)}
        />
      )}
    </PageContainer>
  );
};
