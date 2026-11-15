import { MapPin } from 'lucide-react';

/** Un lugar (dirección, punto de entrega): el alfiler con la punta en el punto (se usa con `anchor="bottom"`). */
export const PlacePin = () => (
  <MapPin aria-hidden="true" className="h-9 w-9 fill-primary stroke-surface drop-shadow-md" strokeWidth={1.5} />
);
