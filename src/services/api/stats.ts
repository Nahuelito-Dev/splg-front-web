import { privateAxiosInstance } from './axiosConfig';

export interface DashboardStats {
  ordersSummary: {
    pending: number;
    accepted: number;
    onTheWay: number;
    deliveredToday: number;
  };
  sales: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  performance: {
    activeDeliveries: number;
    avgOrderValue: number;
    ordersPerDay: number;
  };
  paymentMethods: {
    cash: number;
    mercadopago: number;
  };
}

// Nueva interfaz para el gráfico
export interface ChartData {
  name: string; // "Lun", "Mar"
  date: string; // "2023-10-25"
  sales: number;
}

// Métricas Generales
export const getDashboardStats = async () => {
  const { data } = await privateAxiosInstance.get<DashboardStats>(
    '/orders/stats/summary',
  );
  return data;
};

// Datos del Gráfico (Últimos 7 días)
export const getSalesChart = async () => {
  const { data } = await privateAxiosInstance.get<ChartData[]>(
    '/orders/stats/chart',
  );
  return data;
};
