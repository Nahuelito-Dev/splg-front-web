import { Bike, Car as CarIcon, Truck, type LucideIcon } from 'lucide-react';

/** Ícono según el tipo de vehículo que cargó el admin (texto libre en la API). */
export const carIcon = (type: string | null): LucideIcon => {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('moto')) return Bike;
  if (t.includes('cami')) return Truck;
  return CarIcon;
};
