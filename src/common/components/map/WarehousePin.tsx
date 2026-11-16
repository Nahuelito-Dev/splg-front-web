import { Warehouse } from 'lucide-react';

/** El galpón: de donde sale y adonde vuelve el recorrido. */
export const WarehousePin = () => (
  <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-surface bg-ink text-surface shadow-control">
    <Warehouse aria-hidden="true" className="h-4 w-4" />
  </span>
);
