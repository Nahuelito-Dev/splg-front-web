import { privateAxiosInstance } from './axiosConfig';

export interface DashboardStats {
  ordersSummary: {
    pending: number;
    accepted: number;
    onTheWay: number;
    deliveredToday: number;
    totalDelivered: number;
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
export const getDashboardStats = async (from?: string, to?: string) => {
  const queryParams = from && to ? `?from=${from}&to=${to}` : '';
  const { data } = await privateAxiosInstance.get<DashboardStats>(
    `/orders/stats/summary${queryParams}`,
  );
  return data;
};

// Datos del Gráfico (Últimos 7 días o 12 meses)
export const getSalesChart = async (aggregation: 'day' | 'month' = 'day', from?: string, to?: string) => {
  let url = `/orders/stats/chart?aggregation=${aggregation}`;
  if (from && to) {
    url += `&from=${from}&to=${to}`;
  }
  const { data } = await privateAxiosInstance.get<ChartData[]>(url);
  return data;
};
