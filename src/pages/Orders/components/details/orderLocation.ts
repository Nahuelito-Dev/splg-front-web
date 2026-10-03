import type { Order } from '../../../../services/api/types';

/** El punto de entrega como [lat, lng], o `null` si la dirección no trae coordenadas válidas. */
export const orderCoordinates = (order: Pick<Order, 'delivery_address'>): [number, number] | null => {
  const address = order.delivery_address;
  if (!address?.latitude || !address.longitude) return null;
  const lat = Number(address.latitude);
  const lng = Number(address.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? [lat, lng]
    : null;
};
