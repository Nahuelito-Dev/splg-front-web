import type { LiveVehicle, LiveVehicleStop } from '../services/api/types';

export const liveStop = (over: Partial<LiveVehicleStop> = {}): LiveVehicleStop => ({
  orderId: 'o-1',
  source: 'route_sheet',
  sequence: 1,
  progress: 'pending',
  customerName: 'Ana Gómez',
  address: 'Av. Mitre 123',
  lat: -27.36,
  lng: -55.9,
  etaAt: '2026-11-21T16:30:00.000Z',
  ...over,
});

/** Un vehículo en ruta con hoja, carga al 80 % y tres paradas (entregada, en camino, pendiente). */
export const liveVehicle = (over: Partial<LiveVehicle> = {}): LiveVehicle => ({
  carId: 'car-1',
  patent: 'AB104EJ',
  typeCar: 'Camioneta',
  description: 'Toyota Hilux',
  photoUrl: 'https://fotos.test/hilux.jpg',
  status: 'on_route',
  inUseSince: '2026-11-21T11:00:00.000Z',
  driver: {
    deliveryId: 'del-1',
    userId: 'user-1',
    name: 'Carlos Ruiz',
    phone: '+5493764123456',
    photoUrl: null,
  },
  load: {
    truckLoadId: 'load-1',
    truckLoadNumber: 7,
    truckLoadStatus: 'on_route',
    fullUnits: 20,
    emptyUnits: 12,
    defectiveUnits: 0,
    unitsOnBoard: 32,
    capacityUnits: 40,
    percent: 80,
  },
  sheet: {
    id: 'sheet-1',
    number: 3,
    status: 'assigned',
    planDate: '2026-11-21',
    plannedStartAt: '2026-11-21T12:00:00.000Z',
    startedAt: '2026-11-21T12:05:00.000Z',
    total: 3,
    delivered: 1,
    failed: 0,
    pending: 2,
    estimatedEndAt: '2026-11-21T17:00:00.000Z',
  },
  stops: [
    liveStop({ orderId: 'o-1', sequence: 1, progress: 'delivered', customerName: 'Ana Gómez' }),
    liveStop({ orderId: 'o-2', sequence: 2, progress: 'on_the_way', customerName: 'Bruno Díaz', lat: -27.37 }),
    liveStop({
      orderId: 'o-3',
      sequence: 3,
      progress: 'pending',
      customerName: 'Carla Paz',
      lat: -27.38,
      etaAt: '2026-11-21T17:00:00.000Z',
    }),
  ],
  location: { lat: -27.35, lng: -55.89, at: '2026-11-21T16:00:00.000Z' },
  ...over,
});

/** Las 13:03 de Argentina del 21/11: 57 minutos antes del fin estimado de `liveVehicle`. */
export const LIVE_NOW = new Date('2026-11-21T16:03:00.000Z').getTime();
