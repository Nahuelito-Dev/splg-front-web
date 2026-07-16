import { privateAxiosInstance } from './axiosConfig';

export interface ReservationItem {
  quantity: number;
  type: string | null;
}

export interface Reservation {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  scheduledDate: string | null;
  paymentMethod: string; // 'cash' | 'mercadopago' | ...
  total: number;
  depositAmount: number;
  depositPaid: boolean;
  remainingBalance: number;
  createdAt: string;
  items: ReservationItem[];
}

// Reservas pendientes (pedidos RESERVED) de la distribuidora.
export const getReservations = async () => {
  const { data } =
    await privateAxiosInstance.get<Reservation[]>('/orders/reservations');
  return data;
};

// Confirma la seña cobrada en efectivo -> habilita la activación automática.
export const confirmDeposit = async (orderId: string) => {
  const { data } = await privateAxiosInstance.patch(
    `/orders/${orderId}/confirm-deposit`,
  );
  return data;
};
