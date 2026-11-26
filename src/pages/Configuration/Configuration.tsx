import { Link } from 'react-router-dom';
import { Card, PageHeader, PageContainer } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useCurrentDistributor } from '../../services/queries/distributors';
import { ContainerChargeCard } from './components/ContainerChargeCard';
import { MercadoPagoCard } from './components/MercadoPagoCard';
import { PaymentSurchargesCard } from './components/PaymentSurchargesCard';
import { StockControlCard } from './components/StockControlCard';
import { SlotAvailabilityPanel } from './components/SlotAvailabilityPanel';
import { TimeSlotsManager } from './components/TimeSlotsManager';

export const Configuration = () => {
  const { needsDistributor } = usePermissions();
  const { data: distributor } = useCurrentDistributor(!needsDistributor);
  return (
    <PageContainer size="md">
      <PageHeader title="Configuración" description="Parámetros operativos de la distribuidora." />
      <div className="space-y-6">
        {distributor && (
          <Card className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">
              El logo, el nombre para mostrar y los colores de la empresa están en Apariencia.
            </p>
            <Link to="/settings/appearance" className="text-sm font-semibold text-primary-strong hover:underline">
              Ir a Apariencia
            </Link>
          </Card>
        )}
        <MercadoPagoCard />
        <PaymentSurchargesCard />
        <ContainerChargeCard />
        <StockControlCard />
        <TimeSlotsManager />
        <SlotAvailabilityPanel />
      </div>
    </PageContainer>
  );
};
