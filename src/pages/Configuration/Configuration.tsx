import { PageHeader } from '../../common/components/ui';
import { SlotAvailabilityPanel } from './components/SlotAvailabilityPanel';
import { TimeSlotsManager } from './components/TimeSlotsManager';

export const Configuration = () => {
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader title="Configuración" description="Parámetros operativos de la distribuidora." />
      <div className="space-y-6">
        <TimeSlotsManager />
        <SlotAvailabilityPanel />
      </div>
    </div>
  );
};
