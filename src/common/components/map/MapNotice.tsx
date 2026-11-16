import { MapPinOff } from 'lucide-react';
import type { MapsStatus } from './mapsStatus';

export type MapNoticeReason = Exclude<MapsStatus, 'ok'> | 'missing-key';

const TEXT: Record<MapNoticeReason, { title: string; detail: string }> = {
  'missing-key': {
    title: 'El mapa no está disponible',
    detail: 'Falta configurar la clave de Google Maps del panel (VITE_GOOGLE_MAPS_API_KEY).',
  },
  'auth-failed': {
    title: 'Google Maps rechazó la clave del panel',
    detail: 'Revisá que la clave tenga habilitada la Maps JavaScript API y permiso para este dominio.',
  },
  'load-failed': {
    title: 'No se pudo cargar Google Maps',
    detail: 'Revisá la conexión y recargá la página.',
  },
};

/** Lo que ocupa el lugar del mapa cuando Google Maps no puede dibujarlo: nunca un recuadro gris sin explicación. */
export const MapNotice = ({ reason }: { reason: MapNoticeReason }) => (
  <div
    role="status"
    data-testid="map-notice"
    className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-1.5 bg-surface-sunken p-4 text-center"
  >
    <MapPinOff aria-hidden="true" className="h-6 w-6 text-muted" />
    <b className="text-sm font-semibold text-ink">{TEXT[reason].title}</b>
    <span className="max-w-xs text-xs text-muted">{TEXT[reason].detail}</span>
  </div>
);
