import { privateAxiosInstance } from './axiosConfig';

export interface SalesByDriver {
  driverId: string;
  driverName: string;
  totalOrders: number;
  totalSales: number;
}

export interface SalesByProduct {
  productType: string;
  description: string;
  totalQuantity: number;
  totalSales: number;
}

export interface SalesByPayment {
  method: string;
  totalOrders: number;
  totalSales: number;
}

const buildQuery = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

// GET /reports/sales-by-driver — ventas entregadas agrupadas por repartidor.
export const getSalesByDriver = async (from?: string, to?: string) => {
  const { data } = await privateAxiosInstance.get<SalesByDriver[]>(
    `/reports/sales-by-driver${buildQuery(from, to)}`,
  );
  return data;
};

// GET /reports/sales-by-product — ventas entregadas agrupadas por producto.
export const getSalesByProduct = async (from?: string, to?: string) => {
  const { data } = await privateAxiosInstance.get<SalesByProduct[]>(
    `/reports/sales-by-product${buildQuery(from, to)}`,
  );
  return data;
};

// GET /reports/sales-by-payment — ventas entregadas agrupadas por método de pago.
export const getSalesByPayment = async (from?: string, to?: string) => {
  const { data } = await privateAxiosInstance.get<SalesByPayment[]>(
    `/reports/sales-by-payment${buildQuery(from, to)}`,
  );
  return data;
};

export interface SalesEvolutionPoint {
  period: string;
  totalOrders: number;
  totalSales: number;
}

// GET /reports/sales-evolution — ventas entregadas agrupadas por período (día/mes).
export const getSalesEvolution = async (
  from?: string,
  to?: string,
  granularity: 'day' | 'month' = 'day',
) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('granularity', granularity);
  const { data } = await privateAxiosInstance.get<SalesEvolutionPoint[]>(
    `/reports/sales-evolution?${params.toString()}`,
  );
  return data;
};
