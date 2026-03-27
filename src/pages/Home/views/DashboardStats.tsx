import { useQuery } from '@tanstack/react-query';
import { StatCard } from './StatCard';
import { getAllCustomers } from '../../../services/api/customers';
import { getAllCylinders } from '../../../services/api/cylinders';
import { getDashboardStats } from '../../../services/api/stats';

// Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PropaneIcon from '@mui/icons-material/Propane';
import GroupIcon from '@mui/icons-material/Group';

export const DashboardStats = () => {
  // Ventas y pedidos desde /orders/stats/summary
  const { data: dashboardData, isLoading: isStatsLoading } = useQuery(
    ['dashboardStatsCards'],
    getDashboardStats,
    { refetchInterval: 30000 },
  );

  // Clientes registrados
  const { data: customersData, isLoading: isCustomersLoading } = useQuery(
    ['dashboardCustomers'],
    () => getAllCustomers(0, 100),
  );

  // Stock de garrafas
  const { data: cylindersData, isLoading: isCylindersLoading } = useQuery(
    ['dashboardCylinders'],
    () => getAllCylinders(0, 100),
  );

  // Derivar valores de los queries
  const todaySales = dashboardData?.sales?.today ?? 0;

  const activeOrders =
    (dashboardData?.ordersSummary?.pending ?? 0) +
    (dashboardData?.ordersSummary?.accepted ?? 0) +
    (dashboardData?.ordersSummary?.onTheWay ?? 0);

  const onTheWayCount = dashboardData?.ordersSummary?.onTheWay ?? 0;

  const totalCustomers = customersData?.rows?.length ?? 0;

  const totalStock = cylindersData?.rows?.reduce(
    (acc: number, curr: any) => acc + Number(curr.stock),
    0,
  ) ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. VENTAS DEL DÍA (Data Real) */}
      <StatCard
        title="Ventas del Día"
        value={`$ ${Number(todaySales).toLocaleString()}`}
        change="Ingresos del día"
        isPositive={todaySales > 0}
        color="emerald"
        icon={<AttachMoneyIcon fontSize="large" />}
        isLoading={isStatsLoading}
      />

      {/* 2. PEDIDOS ACTIVOS (Data Real) */}
      <StatCard
        title="Pedidos Activos"
        value={activeOrders}
        change={`${onTheWayCount} en camino`}
        isPositive={true}
        color="blue"
        icon={<LocalShippingIcon fontSize="large" />}
        isLoading={isStatsLoading}
      />

      {/* 3. STOCK (Data Real de Cylinders) */}
      <StatCard
        title="Stock Total (u.)"
        value={totalStock}
        change={totalStock < 50 ? 'Stock Crítico' : 'Inventario Saludable'}
        isPositive={totalStock > 50}
        color={totalStock < 50 ? 'rose' : 'amber'}
        icon={<PropaneIcon fontSize="large" />}
        isLoading={isCylindersLoading}
      />

      {/* 4. CLIENTES (Data Real de Customers) */}
      <StatCard
        title="Clientes Registrados"
        value={totalCustomers}
        change="Total en base de datos"
        isPositive={true}
        color="indigo"
        icon={<GroupIcon fontSize="large" />}
        isLoading={isCustomersLoading}
      />
    </div>
  );
};
