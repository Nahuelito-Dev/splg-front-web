import { Card, EntityPhoto, PageHeader, PageContainer } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useCurrentDistributor } from '../../services/queries/distributors';
import { BankDetailsCard } from './components/BankDetailsCard';
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
        <BankDetailsCard />
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
