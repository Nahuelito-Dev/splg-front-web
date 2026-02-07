import { useEffect, useState } from 'react';
import { StatCard } from './StatCard';
import { getAllCustomers } from '../../../services/api/customers';
import { getAllCylinders } from '../../../services/api/cylinders';

// Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PropaneIcon from '@mui/icons-material/Propane';
import GroupIcon from '@mui/icons-material/Group';

export const DashboardStats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalStock: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ejecutamos ambas peticiones en paralelo
        const [customersData, cylindersData] = await Promise.all([
          getAllCustomers(0, 100), // Traemos hasta 100 para contar (o usar el total del back)
          getAllCylinders(0, 100),
        ]);

        // 1. Calcular Clientes
        // Si tu backend devuelve 'total' real, usa customersData.total.
        // Si no, usamos la longitud del array rows.
        const realCustomersCount = customersData.rows.length;

        // 2. Calcular Stock Total (Suma de stock de todos los tipos de garrafas)
        const totalGasStock = cylindersData.rows.reduce(
          (acc: number, curr: any) => acc + Number(curr.stock),
          0,
        );

        setStats({
          totalCustomers: realCustomersCount,
          totalStock: totalGasStock,
        });
      } catch (error) {
        console.error('Error cargando dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. VENTAS (Mock Data - Aún no hay endpoint) */}
      <StatCard
        title="Ventas del Día"
        value="$ 125.400"
        change="+12% vs ayer"
        isPositive={true}
        color="emerald"
        icon={<AttachMoneyIcon fontSize="large" />}
      />

      {/* 2. PEDIDOS (Mock Data - Aún no hay endpoint) */}
      <StatCard
        title="Pedidos Activos"
        value="24"
        change="8 en camino"
        isPositive={true}
        color="blue"
        icon={<LocalShippingIcon fontSize="large" />}
      />

      {/* 3. STOCK (Data Real de Cylinders) */}
      <StatCard
        title="Stock Total (u.)"
        value={stats.totalStock}
        change={
          stats.totalStock < 50 ? 'Stock Crítico' : 'Inventario Saludable'
        }
        isPositive={stats.totalStock > 50}
        color={stats.totalStock < 50 ? 'rose' : 'amber'} // Cambia a rojo si hay poco
        icon={<PropaneIcon fontSize="large" />}
        isLoading={loading}
      />

      {/* 4. CLIENTES (Data Real de Customers) */}
      <StatCard
        title="Clientes Registrados"
        value={stats.totalCustomers}
        change="Total en base de datos"
        isPositive={true}
        color="indigo"
        icon={<GroupIcon fontSize="large" />}
        isLoading={loading}
      />
    </div>
  );
};
