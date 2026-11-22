import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Car } from '../../../services/api/types';
import { CarsGrid } from './CarsGrid';

afterEach(cleanup);

const car = (over: Partial<Car> = {}): Car =>
  ({
    car_id: 'car-1',
    car_patent: 'AB104EJ',
    car_brand: 'Toyota',
    car_model: 'Hilux',
    type_car: 'Camioneta',
    fleet_status: 'active',
    photoUrl: 'https://fotos.test/hilux.jpg',
    user: { user_id: 'u-1', full_name: 'Carlos Ruiz' },
    ...over,
  }) as unknown as Car;

describe('CarsGrid', () => {
  it('con datos: una tarjeta por vehículo con foto, patente, estado en la flota y chofer', () => {
    const { container } = render(
      <CarsGrid
        rows={[car(), car({ car_id: 'car-2', car_patent: 'AC222BB', fleet_status: 'grounded', user: undefined })]}
        loading={false}
        onView={vi.fn()}
      />,
    );
    const cards = within(screen.getByRole('list', { name: 'Vehículos' })).getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Toyota Hilux · Camioneta')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Activo')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Carlos Ruiz')).toBeInTheDocument();
    expect(container.querySelectorAll('img[src="https://fotos.test/hilux.jpg"]')).toHaveLength(2);
    expect(within(cards[1]).getByText('Fuera de servicio')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Sin chofer asignado')).toBeInTheDocument();
  });

  it('sin foto: el ícono del tipo, sin imagen', () => {
    const { container } = render(<CarsGrid rows={[car({ photoUrl: null })]} loading={false} onView={vi.fn()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('vehicle-photo-fallback')).toBeInTheDocument();
  });

  it('tocar la tarjeta abre la ficha; editar y dar de baja sólo si se pueden', () => {
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const row = car();
    const { rerender } = render(<CarsGrid rows={[row]} loading={false} onView={onView} />);
    expect(screen.queryByRole('button', { name: 'Editar AB104EJ' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la ficha de AB104EJ' }));
    expect(onView).toHaveBeenCalledWith(row);
    rerender(<CarsGrid rows={[row]} loading={false} onView={onView} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar AB104EJ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja AB104EJ' }));
    expect(onEdit).toHaveBeenCalledWith(row);
    expect(onDelete).toHaveBeenCalledWith(row);
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('cargando, vacío, sin resultados y búsqueda fallida se distinguen', () => {
    const { rerender } = render(<CarsGrid rows={[]} loading onView={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Cargando vehículos' })).toBeInTheDocument();
    expect(screen.queryByText('No hay vehículos')).not.toBeInTheDocument();
    rerender(<CarsGrid rows={[]} loading={false} onView={vi.fn()} />);
    expect(screen.getByText('No hay vehículos')).toBeInTheDocument();
    rerender(<CarsGrid rows={[]} loading={false} onView={vi.fn()} searching />);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    rerender(<CarsGrid rows={[]} loading={false} onView={vi.fn()} searching searchFailed />);
    expect(screen.getByText('No se pudo buscar')).toBeInTheDocument();
  });
});
