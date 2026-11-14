import { HardHat, ReceiptText, Truck, Users, type LucideIcon } from 'lucide-react';
import type { Car, Customer, Delivery, Order } from '../../../services/api/types';
import { formatCurrency, formatShortId } from '../../../utils/format';
import { labelOf, ORDER_STATUS } from '../../../utils/statusLabels';
import { NAV_SECTIONS } from '../sidemenu/navConfig';
import { isNavItemVisible, type NavViewer } from '../sidemenu/navScope';

export interface SearchResult {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  to: string;
  icon: LucideIcon;
}

export interface SearchGroup {
  title: string;
  results: SearchResult[];
}

const SCREENS_WITHOUT_TERM = 8;

/** Minúsculas y sin tildes: «vehiculos» encuentra «Vehículos». */
export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Las pantallas del menú que coinciden con el término (o las primeras, sin término). Respeta el alcance del menú. */
export const screenResults = (term: string, viewer: NavViewer): SearchResult[] => {
  const needle = normalizeText(term);
  const all = NAV_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => isNavItemVisible(item, viewer))
      .map<SearchResult>((item) => ({
        id: `screen-${item.path}`,
        group: 'Pantallas',
        title: item.title,
        subtitle: section.title,
        to: item.path,
        icon: item.icon,
      })),
  );
  if (!needle) return all.slice(0, SCREENS_WITHOUT_TERM);
  return all.filter((r) => normalizeText(`${r.title} ${r.subtitle ?? ''}`).includes(needle));
};

const orderResult = (order: Order): SearchResult => ({
  id: `order-${order.order_id}`,
  group: 'Pedidos',
  title: `${formatShortId(order.order_id)} · ${order.customer?.full_name ?? 'Sin cliente'}`,
  subtitle: `${labelOf(ORDER_STATUS, order.status).text} · ${formatCurrency(order.total_amount)}`,
  to: `/orders/${order.order_id}`,
  icon: ReceiptText,
});

const customerResult = (customer: Customer): SearchResult => ({
  id: `customer-${customer.customer_id}`,
  group: 'Clientes',
  title: customer.user?.full_name ?? 'Sin nombre',
  subtitle: customer.user?.email ?? customer.user?.phone_number ?? undefined,
  to: `/customers/details/${customer.customer_id}`,
  icon: Users,
});

const deliveryResult = (delivery: Delivery): SearchResult => ({
  id: `delivery-${delivery.delivery_id}`,
  group: 'Choferes',
  title: delivery.user?.full_name ?? 'Sin nombre',
  subtitle: delivery.user?.email ?? delivery.user?.phone_number ?? undefined,
  to: `/deliveries/details/${delivery.delivery_id}`,
  icon: HardHat,
});

const carResult = (car: Car): SearchResult => ({
  id: `car-${car.car_id}`,
  group: 'Vehículos',
  title: car.car_patent ?? 'Sin patente',
  subtitle: [car.car_brand, car.car_model].filter(Boolean).join(' ') || undefined,
  to: `/cars/details/${car.car_id}`,
  icon: Truck,
});

interface Found {
  orders: Order[];
  customers: Customer[];
  deliveries: Delivery[];
  cars: Car[];
}

/** Los resultados agrupados por tipo, en el orden en que se muestran (y se recorren con las flechas). */
export const buildSearchGroups = (screens: SearchResult[], found: Found): SearchGroup[] =>
  [
    { title: 'Pedidos', results: found.orders.map(orderResult) },
    { title: 'Clientes', results: found.customers.map(customerResult) },
    { title: 'Choferes', results: found.deliveries.map(deliveryResult) },
    { title: 'Vehículos', results: found.cars.map(carResult) },
    { title: 'Pantallas', results: screens },
  ].filter((group) => group.results.length > 0);
