import { useMap } from '@vis.gl/react-google-maps';
import { act, cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FitBounds } from './FitBounds';

type Fn = () => void;
const handlers = new Map<string, Fn[]>();
const fire = (event: string) => (handlers.get(event) ?? []).forEach((fn) => fn());
const listen = (event: string, fn: Fn) => {
  handlers.set(event, [...(handlers.get(event) ?? []), fn]);
  return {
    remove: () =>
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter((f) => f !== fn),
      ),
  };
};

const map = {
  zoom: 13,
  addListener: (event: string, fn: Fn) => listen(event, fn),
  fitBounds: vi.fn(() => fire('zoom_changed')),
  setCenter: vi.fn(),
  setZoom: vi.fn((zoom: number) => {
    map.zoom = zoom;
    fire('zoom_changed');
  }),
  getZoom: () => map.zoom,
};

beforeAll(() => {
  vi.stubGlobal('google', {
    maps: {
      LatLngBounds: class {
        points: unknown[] = [];
        extend(point: unknown) {
          this.points.push(point);
        }
      },
      event: {
        addListenerOnce: (_: unknown, event: string, fn: Fn) => {
          const once = listen(event, () => {
            once.remove();
            fn();
          });
          return once;
        },
      },
    },
  });
});
afterAll(() => {
  vi.unstubAllGlobals();
});
beforeEach(() => {
  handlers.clear();
  map.zoom = 13;
  vi.clearAllMocks();
  vi.mocked(useMap).mockReturnValue(map as unknown as google.maps.Map);
});
afterEach(() => {
  cleanup();
  vi.mocked(useMap).mockReturnValue(null);
});

const a = { lat: -27.3, lng: -55.9 };
const b = { lat: -27.4, lng: -55.8 };
const c = { lat: -27.5, lng: -55.7 };

describe('FitBounds', () => {
  it('encuadra al cargar y cuando cambian los puntos, con el tope de zoom', () => {
    const { rerender } = render(<FitBounds points={[a, b]} maxZoom={15} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    map.zoom = 18;
    act(() => fire('idle'));
    expect(map.setZoom).toHaveBeenCalledWith(15);
    rerender(<FitBounds points={[a, b, c]} maxZoom={15} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });

  it('si la persona movió el mapa no se lo vuelve a encuadrar, hasta que cambia lo que se mira', () => {
    const { rerender } = render(<FitBounds points={[a, b]} scopeKey="hoja-1" />);
    act(() => fire('idle'));
    act(() => fire('dragstart'));
    rerender(<FitBounds points={[a, b, c]} scopeKey="hoja-1" />);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    rerender(<FitBounds points={[b, c]} scopeKey="hoja-2" />);
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });

  it('el zoom del propio encuadre no cuenta como de la persona; el de después, sí', () => {
    const { rerender } = render(<FitBounds points={[a, b]} />);
    act(() => fire('idle'));
    rerender(<FitBounds points={[a, b, c]} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
    act(() => fire('idle'));
    act(() => fire('zoom_changed'));
    rerender(<FitBounds points={[a, c]} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });

  it('con la misma clave (reordenar) no vuelve a encuadrar', () => {
    const { rerender } = render(<FitBounds points={[a, b]} fitKey="k" />);
    act(() => fire('idle'));
    rerender(<FitBounds points={[b, a]} fitKey="k" />);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
  });
});
