import type { Order } from '../../../../services/api/types';

export type DeliveryConfirmation =
  | {
      by: 'driver';
      confirmedAt: string;
      point: [number, number] | null;
      distanceMeters: number | null;
      outOfRange: boolean;
    }
  | { by: 'distributor'; point: null; distanceMeters: null; outOfRange: false };

const finiteCoordinates = (lat: unknown, lng: unknown): [number, number] | null => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? [lat, lng]
    : null;
};

/**
 * Cómo se confirmó la entrega, o `null` si el pedido no está entregado o es anterior al contrato (sin campos nuevos).
 * El rol llega como lo guarda el back (`delivery`, `admin`, `super_admin`), en cualquier capitalización.
 */
export const deliveryConfirmation = (order: Order): DeliveryConfirmation | null => {
  if (order.status !== 'delivered') return null;
  const confirmation = order.deliveryConfirmation;
  if (!confirmation) return null;
  const role = confirmation.confirmedByRole?.toLowerCase() ?? null;
  const point = finiteCoordinates(confirmation.latitude, confirmation.longitude);
  if (role === 'delivery' || point) {
    return {
      by: 'driver',
      confirmedAt: confirmation.confirmedAt,
      point,
      distanceMeters: confirmation.distanceMeters,
      outOfRange: confirmation.outOfRange,
    };
  }
  if (role === 'admin' || role === 'super_admin') {
    return { by: 'distributor', point: null, distanceMeters: null, outOfRange: false };
  }
  return null;
};

export const mapsUrl = ([lat, lng]: [number, number]): string =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
