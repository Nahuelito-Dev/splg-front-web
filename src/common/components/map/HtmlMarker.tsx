import { useMap } from '@vis.gl/react-google-maps';
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LatLng } from './latLng';

interface Props {
  position: LatLng;
  /** Nombre accesible y tooltip. */
  title: string;
  children: ReactNode;
  onClick?: () => void;
  /** Se puede arrastrar; al soltarlo informa el punto nuevo. */
  draggable?: boolean;
  onDragEnd?: (point: LatLng) => void;
  /** `center`: el punto es el centro (paradas, chofer). `bottom`: la punta de abajo (alfiler). */
  anchor?: 'center' | 'bottom';
  /** Los de más arriba tapan a los de abajo (el chofer sobre las paradas, la elegida sobre el resto). */
  zIndex?: number;
}

const ANCHOR = { center: 'translate(-50%, -50%)', bottom: 'translate(-50%, -100%)' };

/**
 * Un marcador hecho con HTML (clases de Tailwind, colores del tema) sobre una `OverlayView` de Google Maps. Se usa en
 * lugar de `AdvancedMarker`, que exige un Map ID y deja afuera el estilo propio (Brasa) del mapa.
 *
 * Sin `onClick` ni arrastre es sólo una marca (una etiqueta, un vértice): va en la capa que no recibe eventos y los
 * clics pasan al mapa. Si cambia de una cosa a la otra se monta de nuevo en la capa que corresponde.
 */
export const HtmlMarker = (props: Props) => {
  const interactive = Boolean(props.onClick) || Boolean(props.draggable);
  return <MarkerOverlay key={interactive ? 'interactive' : 'passive'} {...props} interactive={interactive} />;
};

const MarkerOverlay = ({
  position,
  title,
  children,
  onClick,
  draggable,
  onDragEnd,
  anchor = 'center',
  zIndex = 0,
  interactive,
}: Props & { interactive: boolean }) => {
  const map = useMap();
  const [container] = useState(() => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    if (!interactive) element.style.pointerEvents = 'none';
    return element;
  });
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const positionRef = useRef(position);
  positionRef.current = position;
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  /** Al soltar un arrastre el navegador también manda el clic: ese no cuenta. */
  const dragged = useRef(false);

  useEffect(() => {
    if (!map) return;
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {
      const panes = overlay.getPanes();
      (interactive ? panes?.overlayMouseTarget : panes?.overlayLayer)?.appendChild(container);
    };
    overlay.draw = () => {
      if (drag.current) return;
      const pixel = overlay.getProjection()?.fromLatLngToDivPixel(positionRef.current);
      if (!pixel) return;
      container.style.left = `${pixel.x}px`;
      container.style.top = `${pixel.y}px`;
    };
    overlay.onRemove = () => container.remove();
    // Sólo el que se toca o arrastra frena los clics y gestos del mapa; una etiqueta no puede tragarse un clic.
    if (interactive) google.maps.OverlayView.preventMapHitsAndGesturesFrom(container);
    overlay.setMap(map);
    overlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, container, interactive]);

  useEffect(() => {
    overlayRef.current?.draw();
  }, [position.lat, position.lng]);

  useEffect(() => {
    container.style.zIndex = String(zIndex);
  }, [container, zIndex]);

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (!draggable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      left: parseFloat(container.style.left) || 0,
      top: parseFloat(container.style.top) || 0,
      moved: false,
    };
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) current.moved = true;
    container.style.left = `${current.left + dx}px`;
    container.style.top = `${current.top + dy}px`;
  };

  const endDrag = () => {
    const current = drag.current;
    drag.current = null;
    dragged.current = Boolean(current?.moved);
    if (!current?.moved) return;
    const point = overlayRef.current
      ?.getProjection()
      ?.fromDivPixelToLatLng(new google.maps.Point(parseFloat(container.style.left), parseFloat(container.style.top)));
    if (point) onDragEnd?.({ lat: point.lat(), lng: point.lng() });
    else overlayRef.current?.draw();
  };

  if (!map) return null;

  const content = onClick ? (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="block cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={() => {
        if (dragged.current) dragged.current = false;
        else onClick();
      }}
    >
      {children}
    </button>
  ) : (
    <div title={title} role="img" aria-label={title}>
      {children}
    </div>
  );

  return createPortal(
    <div
      style={{ transform: ANCHOR[anchor] }}
      className={draggable ? 'cursor-grab touch-none active:cursor-grabbing' : undefined}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {content}
    </div>,
    container,
  );
};
