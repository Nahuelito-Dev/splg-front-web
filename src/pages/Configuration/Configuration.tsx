import { Card, EntityPhoto, PageHeader } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useCurrentDistributor } from '../../services/queries/distributors';
import { StockControlCard } from './components/StockControlCard';
import { SlotAvailabilityPanel } from './components/SlotAvailabilityPanel';
import { TimeSlotsManager } from './components/TimeSlotsManager';

export const Configuration = () => {
  const { needsDistributor } = usePermissions();
  const { data: distributor } = useCurrentDistributor(!needsDistributor);
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader title="Configuración" description="Parámetros operativos de la distribuidora." />
      <div className="space-y-6">
        {distributor && (
          <Card className="p-6">
            <EntityPhoto
              kind="distributor"
              id={distributor.distributor_id}
              url={distributor.photoUrl ?? distributor.logo_url}
              subject="de la empresa"
              label="Logo de la empresa"
              fit="contain"
              canEdit
              className="max-w-md"
            />
          </Card>
        )}
        <StockControlCard />
        <TimeSlotsManager />
        <SlotAvailabilityPanel />
      </div>
    </div>
  );
};
