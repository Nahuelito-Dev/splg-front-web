import { PageContainer } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { PlatformHome } from './PlatformHome';
import { ActiveOrdersCard } from './views/ActiveOrdersCard';
import { ActivityCard } from './views/ActivityCard';
import { DistributionCard } from './views/DistributionCard';
import { KpiRow } from './views/KpiRow';
import { OperationCard } from './views/OperationCard';
import { PersonnelCard } from './views/PersonnelCard';
import { SalesAreaCard } from './views/SalesAreaCard';
import { StatusDonutCard } from './views/StatusDonutCard';
import { StockCard } from './views/StockCard';
import { TopDriversCard } from './views/TopDriversCard';
import { WelcomeCard } from './views/WelcomeCard';

/** Inicio «ambos»: el tablero de la empresa (también en modo soporte) o el de la plataforma. */
export const Home = () => {
  const { mode } = usePermissions();
  if (mode === 'platform') return <PlatformHome />;
  return (
    <PageContainer className="grid gap-3.5">
      <WelcomeCard />
      <KpiRow />
      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SalesAreaCard />
        <StatusDonutCard />
      </div>
      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ActiveOrdersCard />
        <ActivityCard />
      </div>
      <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-3">
        <TopDriversCard />
        <DistributionCard />
        <div className="grid content-start gap-3.5 lg:col-span-2 xl:col-span-1">
          <StockCard />
          <OperationCard />
          <PersonnelCard />
        </div>
      </div>
    </PageContainer>
  );
};
