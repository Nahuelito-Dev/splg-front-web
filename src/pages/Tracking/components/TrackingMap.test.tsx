import { useMap } from '@vis.gl/react-google-maps';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrackingMap } from './TrackingMap';

afterEach(() => {
  cleanup();
  vi.mocked(useMap).mockReset();
  vi.mocked(useMap).mockReturnValue(null);
});

const order = (n: number) => ({
  orderId: `o${n}000000-aaaa`,
  driverId: `d${n}000000-bbbb`,
  lat: n === 1 ? -27.31 : -27.32,
  lng: -55.9,
  at: '2026-11-15T13:05:09.000Z',
});

describe('TrackingMap', () => {
  it('dibuja a cada chofer en su posición y al tocarlo muestra el pedido y la hora', () => {
    render(<TrackingMap trackedOrders={[order(1), order(2)]} focusPoint={null} />);
    expect(screen.getByTestId('google-map')).toHaveAttribute('data-gestures', 'greedy');
    const markers = screen.getAllByTestId('map-marker');
    expect(markers.map((m) => m.dataset.lat)).toEqual(['-27.31', '-27.32']);
    expect(screen.queryByTestId('tracking-marker-info')).not.toBeInTheDocument();
    fireEvent.click(markers[0]);
    const info = screen.getByTestId('tracking-marker-info');
    expect(info).toHaveTextContent('Pedido');
    expect(info).toHaveTextContent('Última actualización: 10:05:09');
    fireEvent.click(markers[0]);
    expect(screen.queryByTestId('tracking-marker-info')).not.toBeInTheDocument();
  });

  it('va a la primera posición que llega una sola vez: después no le pisa la vista al admin', () => {
    const map = { panTo: vi.fn(), setZoom: vi.fn() };
    vi.mocked(useMap).mockReturnValue(map as unknown as google.maps.Map);
    const { rerender } = render(<TrackingMap trackedOrders={[]} focusPoint={null} />);
    expect(map.panTo).not.toHaveBeenCalled();
    rerender(<TrackingMap trackedOrders={[order(1)]} focusPoint={{ lat: -27.31, lng: -55.9 }} />);
    rerender(<TrackingMap trackedOrders={[order(1)]} focusPoint={{ lat: -27.5, lng: -55.8 }} />);
    expect(map.panTo).toHaveBeenCalledTimes(1);
    expect(map.panTo).toHaveBeenCalledWith({ lat: -27.31, lng: -55.9 });
    expect(map.setZoom).toHaveBeenCalledWith(15);
  });
});
