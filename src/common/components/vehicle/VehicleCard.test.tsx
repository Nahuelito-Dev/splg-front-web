import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VehicleCard } from './VehicleCard';

afterEach(cleanup);

const base = {
  carId: 'car-1',
  patent: 'AB104EJ',
  description: 'Toyota Hilux',
  typeCar: 'Camioneta',
  photoUrl: 'https://fotos.test/hilux.jpg',
};

describe('VehicleCard', () => {
  it('con datos: patente, descripción, estado y la foto del vehículo', () => {
    const { container } = render(<VehicleCard {...base} status={{ text: 'En ruta', tone: 'success' }} />);
    expect(screen.getByRole('article', { name: 'Vehículo AB104EJ' })).toBeInTheDocument();
    expect(screen.getByText('AB104EJ')).toBeInTheDocument();
    expect(screen.getByText('Toyota Hilux · Camioneta')).toBeInTheDocument();
    expect(screen.getByText('En ruta')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://fotos.test/hilux.jpg"]')).not.toBeNull();
    expect(screen.queryByTestId('vehicle-photo-fallback')).not.toBeInTheDocument();
  });

  it('sin foto: el ícono del tipo en su lugar, sin imagen rota', () => {
    const { container } = render(<VehicleCard {...base} photoUrl={null} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('vehicle-photo-fallback')).toBeInTheDocument();
  });

  it('si la foto no carga y no se puede renovar, queda el ícono', () => {
    const { container } = render(<VehicleCard {...base} photoRenewable={false} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('vehicle-photo-fallback')).toBeInTheDocument();
  });

  it('sin patente lo dice, y sin `onSelect` no es un botón', () => {
    render(<VehicleCard {...base} patent={null} />);
    expect(screen.getByText('Sin patente')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('con `onSelect` se elige con un botón que anuncia si está elegida', () => {
    const onSelect = vi.fn();
    const { rerender } = render(<VehicleCard {...base} onSelect={onSelect} selectLabel="Ver el detalle de" />);
    const button = screen.getByRole('button', { name: 'Ver el detalle de AB104EJ' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    rerender(<VehicleCard {...base} onSelect={onSelect} selectLabel="Ver el detalle de" selected />);
    expect(screen.getByRole('button', { name: 'Ver el detalle de AB104EJ' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('vehicle-card')).toHaveAttribute('data-selected', 'true');
  });

  it('las acciones quedan fuera del botón que elige: tocarlas no elige la tarjeta', () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(
      <VehicleCard
        {...base}
        variant="row"
        onSelect={onSelect}
        actions={
          <button type="button" onClick={onEdit}>
            Editar
          </button>
        }
      >
        <p>Color: blanco</p>
      </VehicleCard>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('Color: blanco')).toBeInTheDocument();
  });
});
