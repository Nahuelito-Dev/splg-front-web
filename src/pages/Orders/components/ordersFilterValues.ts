import type { Order } from '../../../services/api/types';

export interface OrdersFilterValues {
  search: string;
  status: Order['status'] | '';
  from: string;
  to: string;
}

export const EMPTY_FILTERS: OrdersFilterValues = { search: '', status: '', from: '', to: '' };

export const ORDER_STATUSES: Order['status'][] = [
  'reserved',
  'pending',
  'accepted',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export const isOrderStatus = (value: string): value is Order['status'] => (ORDER_STATUSES as string[]).includes(value);
