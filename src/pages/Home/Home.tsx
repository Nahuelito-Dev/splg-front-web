import { PageHeader } from '../../common/components/ui';
import { useAppSelector } from '../../hooks';
import { formatLongDay } from '../../utils/format';
import { greetingFor } from './lib/dashboard';
import { ActiveOrdersCard } from './views/ActiveOrdersCard';
import { KpiRow } from './views/KpiRow';
import { OperationCard } from './views/OperationCard';
import { StockCard } from './views/StockCard';
import { WeeklySalesChart } from './views/WeeklySalesChart';

export const Home = () => {
  const fullName = useAppSelector((state) => state.auth.fullName);
  const now = new Date();
  const firstName = fullName?.split(' ')[0];

  return (
    <div className="mx-auto grid max-w-[1320px] gap-5 p-4 md:px-7 md:py-6">
      <PageHeader
        eyebrow={formatLongDay(now)}
        title={firstName ? `${greetingFor(now)}, ${firstName}` : greetingFor(now)}
      />
      <KpiRow />
      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <ActiveOrdersCard />
        <StockCard />
      </div>
      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <WeeklySalesChart />
        <OperationCard />
      </div>
    </div>
  );
};
