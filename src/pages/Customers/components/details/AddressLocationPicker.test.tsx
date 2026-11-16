import { useMap } from '@vis.gl/react-google-maps';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LatLngTuple } from '../../../../common/components/map/latLng';
import { mapHandlers } from '../../../../test/googleMapsHandlers';
import { AddressLocationPicker } from './AddressLocationPicker';

/**
 * El mapa de mentira con una vista que nunca contiene el pin, como si el usuario hubiera paneado a otro lado: así cada
 * vez que el picker decide «seguir al punto» se ve en `panTo`.
 */
const map = { panTo: vi.fn(), getBounds: () => ({ contains: () => false }) };
beforeEach(() => {
  map.panTo.mockClear();
  vi.mocked(useMap).mockReturnValue(map as unknown as google.maps.Map);
});
afterEach(() => {
  cleanup();
  vi.mocked(useMap).mockReturnValue(null);
});

const draw = (value: LatLngTuple | null, onChange = vi.fn()) => (
  <AddressLocationPicker value={value} onChange={onChange} />
);

describe('AddressLocationPicker: seguir al punto', () => {
  it('un re-render con las mismas coordenadas (array nuevo) no vuelve a centrar el mapa', () => {
    const { rerender } = render(draw([-27.4, -55.89]));
    const calls = map.panTo.mock.calls.length;
    rerender(draw([-27.4, -55.89]));
    rerender(draw([-27.4, -55.89]));
    expect(map.panTo.mock.calls.length).toBe(calls);
  });

  it('cuando las coordenadas cambian de verdad y quedan fuera de la vista, centra en el punto nuevo', () => {
    const { rerender } = render(draw([-27.4, -55.89]));
    map.panTo.mockClear();
    rerender(draw([-27.5, -55.7]));
    expect(map.panTo).toHaveBeenCalledTimes(1);
    expect(map.panTo).toHaveBeenCalledWith({ lat: -27.5, lng: -55.7 });
  });
});

describe('AddressLocationPicker: elegir el punto', () => {
  it('sin punto no hay marcador y un clic en el mapa lo elige', () => {
    const onChange = vi.fn();
    render(draw(null, onChange));
    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument();
    expect(screen.getByText('Hacé clic en el mapa para marcar dónde vive el cliente.')).toBeInTheDocument();
    act(() => mapHandlers.click({ lat: -27.41, lng: -55.88 }));
    expect(onChange).toHaveBeenCalledWith([-27.41, -55.88]);
  });

  it('con punto, el marcador se puede arrastrar y se muestran las coordenadas', () => {
    render(draw([-27.4, -55.89]));
    expect(screen.getByTestId('map-marker')).toHaveAttribute('data-draggable', 'true');
    expect(screen.getByText('-27.400000, -55.890000')).toBeInTheDocument();
  });
});
