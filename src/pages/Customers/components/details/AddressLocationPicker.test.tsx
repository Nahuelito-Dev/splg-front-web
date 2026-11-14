import { cleanup, render } from '@testing-library/react';
import L, { type LatLngTuple } from 'leaflet';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { AddressLocationPicker } from './AddressLocationPicker';

/**
 * El picker real (react-leaflet en jsdom). `getBounds` se fija lejos del pin, como si el usuario hubiera paneado el
 * mapa a otro lado: así cada vez que el picker decide «seguir al punto» se ve en `panTo`.
 */
let panTo: MockInstance<[L.LatLngExpression, L.PanOptions?], L.Map>;
beforeEach(() => {
  vi.spyOn(L.Map.prototype, 'getBounds').mockReturnValue(L.latLngBounds([10, 10], [11, 11]));
  panTo = vi.spyOn(L.Map.prototype, 'panTo').mockImplementation(function (this: L.Map) {
    return this;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const draw = (value: LatLngTuple | null) => <AddressLocationPicker value={value} onChange={vi.fn()} />;

describe('AddressLocationPicker: seguir al punto', () => {
  it('un re-render con las mismas coordenadas (array nuevo) no vuelve a centrar el mapa', () => {
    const { rerender } = render(draw([-27.4, -55.89]));
    const calls = panTo.mock.calls.length;
    rerender(draw([-27.4, -55.89]));
    rerender(draw([-27.4, -55.89]));
    expect(panTo.mock.calls.length).toBe(calls);
  });

  it('cuando las coordenadas cambian de verdad y quedan fuera de la vista, centra en el punto nuevo', () => {
    const { rerender } = render(draw([-27.4, -55.89]));
    panTo.mockClear();
    rerender(draw([-27.5, -55.7]));
    expect(panTo).toHaveBeenCalledTimes(1);
    expect(panTo.mock.calls[0][0]).toEqual([-27.5, -55.7]);
  });
});
