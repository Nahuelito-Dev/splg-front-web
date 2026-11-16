import { Truck } from 'lucide-react';

/** El chofer en su última posición: el camión en azul, con un halo para encontrarlo de un vistazo. */
export const DriverPin = () => (
  <span className="relative flex h-8 w-8 items-center justify-center">
    <span
      aria-hidden="true"
      className="absolute inset-0 animate-ping rounded-full bg-info/30 motion-reduce:animate-none"
    />
    <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-info text-white shadow-control">
      <Truck aria-hidden="true" className="h-4 w-4" />
    </span>
  </span>
);
