import { privateAxiosInstance } from './axiosConfig';

// Interfaces basadas en tu OrderResponseDto
export interface OrderItem {
  quantity: number;
  cylinder: {
    type: string;
    price: number;
  };
}

export interface Order {
  order_id: string; // Ojo: Tu DTO dice 'id' pero tu entidad 'order_id'. Ajusta según lo que llegue.
  id?: string; // Por si el mapper devuelve 'id'
  customer: {
    full_name: string;
    phone_number: string;
    email: string;
  };
  delivery?: {
    user: {
      full_name: string;
      phone_number: string;
    };
  };
  status: 'pending' | 'accepted' | 'on_the_way' | 'delivered' | 'cancelled';
  totalAmount: number;
  paymentMethod: string;
  address: {
    formattedAddress: string;
    street: string;
  };
  createdAt: string;
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  actualDeliveryDate?: string | null;
  deliveredAt?: string | null;
  updatedAt?: string;
  cancellationReason?: string | null;
  items: OrderItem[];
}

// 1. Obtener todas (Paginadas)
export const getAllOrders = async (
  page = 0,
  limit = 10,
  term?: string,
  startDate?: string,
  endDate?: string,
) => {
  const offset = limit * page;
  let url = `/orders?limit=${limit}&offset=${offset}`;

  if (term) {
    url += `&term=${term}`;
  }
  if (startDate) {
    url += `&startDate=${startDate}`;
  }
  if (endDate) {
    url += `&endDate=${endDate}`;
  }

  const { data } = await privateAxiosInstance.get(url);
  return data;
};

// 2. Asignación Manual (Admin Override)
export const assignDriverToOrder = async (
  orderId: string,
  deliveryId: string,
) => {
  // Endpoint: @Patch(':id/assign/:deliveryId')
  const { data } = await privateAxiosInstance.patch(
    `/orders/${orderId}/assign/${deliveryId}`,
  );
  return data;
};

// 3. Cancelar (Admin Force)
export const cancelOrder = async (orderId: string, reason: string) => {
  // El backend toma el actor (id y rol) del token, nunca del cuerpo: mandarle
  // userId y role hacia que el ValidationPipe rechazara la peticion con un 400
  // ("property userId should not exist"), asi que la cancelacion no funcionaba.
  const { data } = await privateAxiosInstance.patch(
    `/orders/${orderId}/cancel`,
    { reason },
  );
  return data;
};


export const getOrdersByCustomer = async (
  customerId: string,
  page = 0,
  limit = 10,
) => {
  const offset = limit * page;
  // Endpoint del backend: @Get('customer/:customerId')
  const { data } = await privateAxiosInstance.get(
    `/orders/customer/${customerId}?limit=${limit}&offset=${offset}`,
  );
  return data; // Devuelve { orders: [], total: N }
};
