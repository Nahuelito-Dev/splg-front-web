import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../../../services/api/stats';
import { StatCard } from './StatCard'; // Reutilizamos tu componente visual existente

// Iconos
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

export const SalesStats = () => {
  const { data, isLoading } = useQuery(
    ['dashboardStats'],
    () => getDashboardStats(),
    {
      refetchInterval: 30000, // Refrescar cada 30 seg para ver ventas en vivo
    },
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-400">Cargando métricas...</div>
    );
  }

  const stats: any = data || {
    sales: { today: 0, month: 0 },
    ordersSummary: { deliveredToday: 0, pending: 0, accepted: 0, onTheWay: 0 },
    performance: { avgOrderValue: 0 },
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Ventas de Hoy */}
      <StatCard
        title="Ventas Hoy"
        value={`$ ${Number(stats.sales.today).toLocaleString()}`}
        icon={<AttachMoneyIcon fontSize="large" />}
        color="emerald"
        change="Ingresos netos"
        isPositive={true}
      />

      {/* 2. Pedidos Entregados Hoy */}
      <StatCard
        title="Entregas Hoy"
        value={stats.ordersSummary.deliveredToday}
        icon={<ShoppingBagIcon fontSize="large" />}
        color="blue"
        change={`${stats.ordersSummary.pending || 0} pendientes`}
        isPositive={(stats.ordersSummary.pending || 0) === 0}
      />

      {/* 3. Ticket Promedio */}
      <StatCard
        title="Ticket Promedio"
        value={`$ ${Math.round(stats.performance.avgOrderValue).toLocaleString()}`}
        icon={<TrendingUpIcon fontSize="large" />}
        color="indigo"
        change="Valor medio por pedidos de hoy"
        isPositive={true}
      />

      {/* 4. Ventas del Mes */}
      <StatCard
        title="Acumulado Mes"
        value={`$ ${Number(stats.sales.month).toLocaleString()}`}
        icon={<AccountBalanceWalletIcon fontSize="large" />}
        color="pink"
        change="Total facturado"
        isPositive={true}
      />
    </div>
  );
};
