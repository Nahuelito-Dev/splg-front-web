import { useMap } from '@vis.gl/react-google-maps';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('./HtmlMarker');
import { HtmlMarker } from './HtmlMarker';

/** Una proyección de juguete: 1 grado = 1000 px. */
const pane = document.createElement('div');
const passivePane = document.createElement('div');
class FakeOverlay {
  onAdd = () => undefined;
  draw = () => undefined;
  onRemove = () => undefined;
  static preventMapHitsAndGesturesFrom = vi.fn();
  getPanes() {
    return { overlayMouseTarget: pane, overlayLayer: passivePane };
  }
  getProjection() {
    return {
      fromLatLngToDivPixel: (p: { lat: number; lng: number }) => ({ x: p.lng * 1000, y: -p.lat * 1000 }),
      fromDivPixelToLatLng: (pt: { x: number; y: number }) => ({ lat: () => -pt.y / 1000, lng: () => pt.x / 1000 }),
    };
  }
  setMap(map: unknown) {
    if (map) {
      this.onAdd();
      this.draw();
    } else this.onRemove();
  }
}

beforeAll(() => {
  vi.stubGlobal('google', {
    maps: {
      OverlayView: FakeOverlay,
      Point: class {
        constructor(
          readonly x: number,
          readonly y: number,
        ) {}
      },
    },
  });
  // jsdom no trae PointerEvent: sin él, `fireEvent.pointer*` pierde `clientX`/`clientY`.
  if (!('PointerEvent' in window)) {
    vi.stubGlobal(
      'PointerEvent',
      class extends MouseEvent {
        readonly pointerId: number;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 0;
        }
      },
    );
  }
  document.body.append(pane, passivePane);
  HTMLElement.prototype.setPointerCapture = vi.fn();
});
afterAll(() => {
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.mocked(useMap).mockReturnValue({} as google.maps.Map);
});
afterEach(() => {
  cleanup();
  FakeOverlay.preventMapHitsAndGesturesFrom.mockClear();
  vi.mocked(useMap).mockReturnValue(null);
});

const container = () => pane.firstElementChild as HTMLElement;
const passive = () => passivePane.firstElementChild as HTMLElement;

describe('HtmlMarker', () => {
  it('sin mapa no dibuja nada', () => {
    vi.mocked(useMap).mockReturnValue(null);
    render(
      <HtmlMarker position={{ lat: -27, lng: -55 }} title="Parada">
        <span>1</span>
      </HtmlMarker>,
    );
    expect(screen.queryByRole('img', { name: 'Parada' })).not.toBeInTheDocument();
  });

  it('pone el contenido en la capa del mapa, en el píxel del punto, y lo mueve si cambia el punto', () => {
    const { rerender } = render(
      <HtmlMarker position={{ lat: -27, lng: -55 }} title="Parada" zIndex={7}>
        <span>1</span>
      </HtmlMarker>,
    );
    expect(screen.getByRole('img', { name: 'Parada' })).toHaveTextContent('1');
    expect(passive().style.left).toBe('-55000px');
    expect(passive().style.top).toBe('27000px');
    expect(passive().style.zIndex).toBe('7');
    rerender(
      <HtmlMarker position={{ lat: -27.5, lng: -55 }} title="Parada">
        <span>1</span>
      </HtmlMarker>,
    );
    expect(passive().style.top).toBe('27500px');
  });

  it('sin clic ni arrastre (una etiqueta) no se traga los clics: capa sin eventos y sin frenar al mapa', () => {
    render(
      <HtmlMarker position={{ lat: -27, lng: -55 }} title="Zona Centro">
        <span>Centro</span>
      </HtmlMarker>,
    );
    expect(passive().style.pointerEvents).toBe('none');
    expect(pane.childElementCount).toBe(0);
    expect(FakeOverlay.preventMapHitsAndGesturesFrom).not.toHaveBeenCalled();
  });

  it('si pasa a tocarse, se monta en la capa de eventos y frena los clics del mapa', () => {
    const { rerender } = render(
      <HtmlMarker position={{ lat: -27, lng: -55 }} title="Zona Centro">
        <span>Centro</span>
      </HtmlMarker>,
    );
    rerender(
      <HtmlMarker position={{ lat: -27, lng: -55 }} title="Zona Centro" onClick={vi.fn()}>
        <span>Centro</span>
      </HtmlMarker>,
    );
    expect(passivePane.childElementCount).toBe(0);
    expect(container().style.pointerEvents).toBe('');
    expect(FakeOverlay.preventMapHitsAndGesturesFrom).toHaveBeenCalledWith(container());
  });

  it('con onClick es un botón con nombre', () => {
    const onClick = vi.fn();
    render(
      <HtmlMarker position={{ lat: -27, lng: -55 }} title="2. Cliente" onClick={onClick}>
        <span>2</span>
      </HtmlMarker>,
    );
    fireEvent.click(screen.getByRole('button', { name: '2. Cliente' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('arrastrado informa el punto donde se soltó y ese clic no cuenta', () => {
    const onDragEnd = vi.fn();
    const onClick = vi.fn();
    render(
      <HtmlMarker position={{ lat: -27, lng: -55 }} title="Pin" draggable onDragEnd={onDragEnd} onClick={onClick}>
        <span>pin</span>
      </HtmlMarker>,
    );
    const handle = screen.getByRole('button', { name: 'Pin' }).parentElement as HTMLElement;
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 150, clientY: 80 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 150, clientY: 80 });
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(onDragEnd).toHaveBeenCalledWith({ lat: -26.98, lng: -54.95 });
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
