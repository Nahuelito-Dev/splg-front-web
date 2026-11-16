import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CoverageZone } from '../../../services/api/types';
import { mapHandlers, polygonHandlers } from '../../../test/googleMapsHandlers';
import { ZoneMap, type MapMode } from './ZoneMap';

afterEach(cleanup);

const zone = (id: string, over: Partial<CoverageZone> = {}) =>
  ({
    coverage_zone_id: id,
    name: `Zona ${id}`,
    color: null,
    surchargeType: 'percentage',
    surchargeValue: 10,
    area: {
      type: 'Polygon',
      coordinates: [
        [
          [-55.9, -27.36],
          [-55.88, -27.36],
          [-55.88, -27.38],
          [-55.9, -27.36],
        ],
      ],
    },
    ...over,
  }) as CoverageZone;

const setup = (mode: MapMode, over: Partial<Parameters<typeof ZoneMap>[0]> = {}) => {
  const props = {
    zones: [zone('a'), zone('b')],
    selectedZoneId: 'a',
    mode,
    onSelectZone: vi.fn(),
    onPolygonChange: vi.fn(),
    onPickPoint: vi.fn(),
    pickedPoint: null,
    ...over,
  };
  const view = render(<ZoneMap {...props} />);
  return { props, rerender: (next: Partial<typeof props>) => view.rerender(<ZoneMap {...props} {...next} />) };
};

const p = (n: number) => ({ lat: -27.3 - n / 100, lng: -55.9 + n / 100 });

describe('ZoneMap', () => {
  it('dibuja cada zona sin repetir el punto que cierra el anillo, con su nombre y recargo', () => {
    setup('idle');
    const polygons = screen.getAllByTestId('map-polygon');
    expect(polygons).toHaveLength(2);
    expect(polygons[0]).toHaveAttribute('data-vertices', '3');
    expect(polygons[0]).toHaveAttribute('data-editable', 'false');
    expect(screen.getByRole('button', { name: 'Zona a · +10 %' })).toBeInTheDocument();
    expect(screen.queryByTestId('zone-map-hint')).not.toBeInTheDocument();
  });

  it('sin modo, tocar una zona la elige', () => {
    const { props } = setup('idle');
    fireEvent.click(screen.getAllByTestId('map-polygon')[1]);
    expect(props.onSelectZone).toHaveBeenCalledWith(props.zones[1]);
  });

  it('al dibujar, cada clic suma un vértice y el doble clic cierra la zona sin los puntos repetidos', () => {
    const { props } = setup('draw', { selectedZoneId: null });
    expect(screen.getByTestId('zone-map-hint')).toHaveTextContent('Hacé clic para marcar los vértices');
    act(() => mapHandlers.click(p(1)));
    act(() => mapHandlers.click(p(2)));
    expect(screen.getByTestId('map-polyline')).toHaveAttribute('data-points', '2');
    // El doble clic: dos clics en el mismo lugar y después el evento de doble clic.
    act(() => mapHandlers.click(p(3)));
    act(() => mapHandlers.click(p(3)));
    act(() => mapHandlers.dblclick(p(3)));
    expect(props.onPolygonChange).toHaveBeenCalledWith([
      [p(1).lng, p(1).lat],
      [p(2).lng, p(2).lat],
      [p(3).lng, p(3).lat],
    ]);
    const draft = screen.getAllByTestId('map-polygon')[2];
    expect(draft).toHaveAttribute('data-editable', 'true');
    expect(draft).toHaveAttribute('data-vertices', '3');
    expect(screen.getByTestId('zone-map-hint')).toHaveTextContent('antes de guardarla');
  });

  it('con menos de 3 vértices el doble clic no cierra; con 3, tocar el primero sí', () => {
    const { props } = setup('draw', { selectedZoneId: null });
    act(() => mapHandlers.click(p(1)));
    act(() => mapHandlers.click(p(2)));
    act(() => mapHandlers.dblclick(p(2)));
    expect(props.onPolygonChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cerrar la zona' })).not.toBeInTheDocument();
    act(() => mapHandlers.click(p(3)));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar la zona' }));
    expect(props.onPolygonChange).toHaveBeenCalledTimes(1);
  });

  it('el ajuste de un vértice de la zona cerrada se informa', () => {
    const { props } = setup('draw', { selectedZoneId: null });
    [1, 2, 3].forEach((n) => act(() => mapHandlers.click(p(n))));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar la zona' }));
    act(() => polygonHandlers.change([p(1), p(2), p(4)]));
    expect(props.onPolygonChange).toHaveBeenLastCalledWith([
      [p(1).lng, p(1).lat],
      [p(2).lng, p(2).lat],
      [p(4).lng, p(4).lat],
    ]);
  });

  it('al salir de dibujar se descarta el trazo', () => {
    const { rerender } = setup('draw', { selectedZoneId: null });
    act(() => mapHandlers.click(p(1)));
    act(() => mapHandlers.click(p(2)));
    rerender({ mode: 'idle' });
    rerender({ mode: 'draw' });
    expect(screen.queryByTestId('map-polyline')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('img', { name: /Vértice/ })).toHaveLength(0);
  });

  it('al editar, sólo la zona elegida tiene los vértices arrastrables y cada ajuste se informa', () => {
    const { props } = setup('edit');
    const [a, b] = screen.getAllByTestId('map-polygon');
    expect(a).toHaveAttribute('data-editable', 'true');
    expect(b).toHaveAttribute('data-editable', 'false');
    act(() => polygonHandlers.change([p(1), p(2), p(3), p(4)]));
    expect(props.onPolygonChange).toHaveBeenCalledWith([p(1), p(2), p(3), p(4)].map(({ lat, lng }) => [lng, lat]));
  });

  it('al salir de editar sin guardar (cancelar, o después de un error) la zona vuelve a su forma guardada', () => {
    const { rerender } = setup('edit');
    act(() => polygonHandlers.change([p(1), p(2), p(3), p(4), p(5)]));
    expect(screen.getAllByTestId('map-polygon')[0]).toHaveAttribute('data-vertices', '5');
    rerender({ mode: 'idle' });
    expect(screen.getAllByTestId('map-polygon')[0]).toHaveAttribute('data-vertices', '3');
    expect(screen.getByRole('button', { name: 'Zona a · +10 %' })).toHaveAttribute(
      'data-lat',
      String((-27.36 * 2 - 27.38) / 3),
    );
  });

  it('al probar un punto, el clic lo informa y el punto elegido se marca', () => {
    const { props, rerender } = setup('pick');
    act(() => mapHandlers.click(p(5)));
    expect(props.onPickPoint).toHaveBeenCalledWith(p(5));
    rerender({ pickedPoint: p(5) });
    expect(screen.getByRole('img', { name: 'Punto a probar' })).toHaveAttribute('data-lat', String(p(5).lat));
  });
});
