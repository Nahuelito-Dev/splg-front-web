/** Lo que los tests manejan del Google Maps de mentira (`googleMapsMock`). */
import { vi } from 'vitest';

type Point = { lat: number; lng: number };

/** Los clics del último mapa dibujado: `act(() => mapHandlers.click({ lat, lng }))`. */
export const mapHandlers: { click: (point: Point) => void; dblclick: (point: Point) => void } = {
  click: () => undefined,
  dblclick: () => undefined,
};

/** Los cambios de vértices del último polígono editable: `act(() => polygonHandlers.change(ring))`. */
export const polygonHandlers: { change: (ring: Point[]) => void } = { change: () => undefined };

/**
 * Los marcadores arrastrables, por su nombre: `act(() => markerHandlers.drag('Ubicación elegida…', { lat, lng }))` hace
 * lo mismo que soltar el marcador en ese punto.
 */
export const markerHandlers = {
  dragEnd: new Map<string, (point: Point) => void>(),
  drag(title: string, point: Point) {
    const handler = this.dragEnd.get(title);
    if (!handler) throw new Error(`No hay un marcador arrastrable «${title}»`);
    handler(point);
  },
};

/** El error de carga del último `APIProvider`: `act(() => apiProviderHandlers.fail())`. */
export const apiProviderHandlers: { fail: () => void } = { fail: () => undefined };

/** Sin mapa (`null`) salvo que el test ponga uno: `vi.mocked(useMap).mockReturnValue(map)`. */
export const useMap = vi.fn((): unknown => null);
export const useMapsLibrary = vi.fn((): unknown => null);
