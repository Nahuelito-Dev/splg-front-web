import { ActiveOrdersCard } from './views/ActiveOrdersCard';
import { ActivityCard } from './views/ActivityCard';
import { DistributionCard } from './views/DistributionCard';
import { KpiRow } from './views/KpiRow';
import { OperationCard } from './views/OperationCard';
import { SalesAreaCard } from './views/SalesAreaCard';
import { StatusDonutCard } from './views/StatusDonutCard';
import { StockCard } from './views/StockCard';
import { TopDriversCard } from './views/TopDriversCard';
import { WelcomeCard } from './views/WelcomeCard';

export const Home = () => (
  <div className="mx-auto grid max-w-[1320px] gap-3.5 p-4 md:px-7 md:py-6">
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
      </div>
    </div>
  </div>
);
