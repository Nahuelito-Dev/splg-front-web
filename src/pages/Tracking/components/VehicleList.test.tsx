import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LIVE_NOW, liveVehicle } from '../../../test/liveFleetFixtures';
import { VehicleList } from './VehicleList';

afterEach(cleanup);

const base = {
  vehicles: [],
  selectedCarId: null,
  onSelect: vi.fn(),
  now: LIVE_NOW,
  isLoading: false,
  isError: false,
  error: null,
  onRetry: vi.fn(),
  needsDistributor: false,
};

describe('VehicleList', () => {
  it('con datos: una tarjeta por vehículo con patente, estado, foto, chofer, tiempo restante, carga y paradas', () => {
    const waiting = liveVehicle({
      carId: 'car-2',
      patent: 'AC222BB',
      status: 'waiting',
      photoUrl: null,
      sheet: null,
      stops: [],
      location: null,
    });
    const { container } = render(<VehicleList {...base} vehicles={[liveVehicle(), waiting]} />);
    const cards = within(screen.getByRole('list', { name: 'Vehículos en uso' })).getAllByRole('article');
    expect(cards).toHaveLength(2);
    const first = within(cards[0]);
    expect(first.getByText('AB104EJ')).toBeInTheDocument();
    expect(first.getByText('En ruta')).toBeInTheDocument();
    expect(first.getByText('Carlos Ruiz')).toBeInTheDocument();
    expect(first.getByText('Faltan 57 min')).toBeInTheDocument();
    expect(first.getByRole('meter', { name: 'Carga del vehículo' })).toHaveAttribute('aria-valuenow', '80');
    expect(first.getByRole('list', { name: 'Paradas' })).toBeInTheDocument();
    expect(container.querySelector('img[src="https://fotos.test/hilux.jpg"]')).not.toBeNull();
    // Sin foto, sin hoja y sin posición: el ícono, y se dice lo que falta en vez de un tiempo inventado.
    const second = within(cards[1]);
    expect(second.getByText('Esperando')).toBeInTheDocument();
    expect(second.getByTestId('vehicle-photo-fallback')).toBeInTheDocument();
    expect(second.getByText('Sin posición')).toBeInTheDocument();
    expect(second.getByText('Sin paradas asignadas')).toBeInTheDocument();
  });

  it('elegir una tarjeta informa el vehículo y la marca como elegida', () => {
    const onSelect = vi.fn();
    render(<VehicleList {...base} vehicles={[liveVehicle()]} selectedCarId="car-1" onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: 'Ver el detalle de AB104EJ' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith('car-1');
  });

  it('cargando: esqueleto, sin afirmar que no hay vehículos', () => {
    render(<VehicleList {...base} isLoading />);
    expect(screen.getByRole('status', { name: 'Cargando vehículos' })).toBeInTheDocument();
    expect(screen.queryByText('No hay vehículos en uso')).not.toBeInTheDocument();
  });

  it('error (un 403 incluido): se muestra con reintentar, nunca como lista vacía', () => {
    const onRetry = vi.fn();
    render(<VehicleList {...base} isError error={new Error('No tenés permiso')} onRetry={onRetry} />);
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    expect(screen.queryByText('No hay vehículos en uso')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('vacío: explica cuándo va a aparecer un vehículo', () => {
    render(<VehicleList {...base} />);
    expect(screen.getByText('No hay vehículos en uso')).toBeInTheDocument();
  });

  it('administrador general sin distribuidora: pide elegir una', () => {
    render(<VehicleList {...base} needsDistributor isLoading />);
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
