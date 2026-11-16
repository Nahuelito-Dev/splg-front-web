/** `HtmlMarker` sin `OverlayView` (jsdom no tiene Google Maps): el contenido en el lugar, con su nombre y su punto. */
import type { ReactNode } from 'react';
import { markerHandlers } from './googleMapsHandlers';

interface Props {
  position: { lat: number; lng: number };
  title: string;
  children: ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  onDragEnd?: (point: { lat: number; lng: number }) => void;
}

export const HtmlMarker = ({ position, title, children, onClick, draggable, onDragEnd }: Props) => {
  if (draggable && onDragEnd) markerHandlers.dragEnd.set(title, onDragEnd);
  const data = {
    'data-testid': 'map-marker',
    'data-lat': position.lat,
    'data-lng': position.lng,
    'data-draggable': draggable ? 'true' : 'false',
  };
  return onClick ? (
    <button type="button" aria-label={title} onClick={onClick} {...data}>
      {children}
    </button>
  ) : (
    <span role="img" aria-label={title} {...data}>
      {children}
    </span>
  );
};
