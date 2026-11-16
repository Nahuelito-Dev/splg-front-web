import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiProviderHandlers, mapHandlers } from '../../../test/googleMapsHandlers';
import { MapCanvas } from './MapCanvas';
import { mapsStatusStore } from './mapsStatus';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  act(() => mapsStatusStore.reset());
});

describe('MapCanvas', () => {
  it('con la clave dibuja Google Maps con el estilo Brasa y lo que va encima', () => {
    render(
      <MapCanvas label="Mapa de prueba" defaultCenter={{ lat: -27.4, lng: -55.9 }} defaultZoom={14}>
        <span>parada</span>
      </MapCanvas>,
    );
    const map = screen.getByTestId('google-map');
    expect(screen.getByRole('group', { name: 'Mapa de prueba' })).toContainElement(map);
    expect(map).toHaveAttribute('data-styled', 'true');
    expect(map).toHaveAttribute('data-center', '-27.4,-55.9');
    expect(map).toHaveAttribute('data-gestures', 'cooperative');
    expect(screen.getByText('parada')).toBeInTheDocument();
    expect(screen.queryByTestId('map-notice')).not.toBeInTheDocument();
  });

  it('crea su propio contexto de apilamiento: las capas del mapa no tapan el header ni los drawers', () => {
    render(<MapCanvas label="Mapa de prueba" />);
    expect(screen.getByRole('group', { name: 'Mapa de prueba' })).toHaveClass('isolate', 'relative');
  });

  it('sin la clave muestra el aviso en el lugar del mapa, no un recuadro vacío', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    render(<MapCanvas label="Mapa de prueba" overlay={<p>ayuda</p>} />);
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('El mapa no está disponible');
    expect(screen.getByRole('status')).toHaveTextContent('VITE_GOOGLE_MAPS_API_KEY');
    expect(screen.getByText('ayuda')).toBeInTheDocument();
  });

  it('si Google rechaza la clave (gm_authFailure) todos los mapas pasan al aviso', () => {
    render(
      <>
        <MapCanvas label="Uno" />
        <MapCanvas label="Dos" />
      </>,
    );
    expect(screen.getAllByTestId('google-map')).toHaveLength(2);
    act(() => window.gm_authFailure?.());
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
    expect(screen.getAllByText('Google Maps rechazó la clave del panel')).toHaveLength(2);
  });

  it('si el script de Google Maps no carga (onError del proveedor) avisa en el lugar del mapa', () => {
    render(<MapCanvas label="Mapa de prueba" />);
    act(() => apiProviderHandlers.fail());
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo cargar Google Maps');
    expect(screen.getByRole('status')).toHaveTextContent('Revisá la conexión y recargá la página.');
  });

  it('un clic en el mapa informa el punto', () => {
    const onClick = vi.fn();
    render(<MapCanvas label="Mapa de prueba" onClick={onClick} />);
    act(() => mapHandlers.click({ lat: -27.41, lng: -55.92 }));
    expect(onClick).toHaveBeenCalledWith({ lat: -27.41, lng: -55.92 });
  });
});
