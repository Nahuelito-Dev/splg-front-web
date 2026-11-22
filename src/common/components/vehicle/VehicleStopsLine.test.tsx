import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { liveStop } from '../../../test/liveFleetFixtures';
import { VehicleStopsLine } from './VehicleStopsLine';

afterEach(cleanup);

const five = [
  liveStop({ orderId: 'o-1', sequence: 1, progress: 'delivered', customerName: 'Uno' }),
  liveStop({ orderId: 'o-2', sequence: 2, progress: 'delivered', customerName: 'Dos' }),
  liveStop({ orderId: 'o-3', sequence: 3, progress: 'on_the_way', customerName: 'Tres' }),
  liveStop({ orderId: 'o-4', sequence: 4, progress: 'pending', customerName: 'Cuatro' }),
  liveStop({ orderId: 'o-5', sequence: 5, progress: 'pending', customerName: 'Cinco' }),
];

describe('VehicleStopsLine', () => {
  it('vacío: lo dice en lugar de dibujar una línea sin puntos', () => {
    render(<VehicleStopsLine stops={[]} />);
    expect(screen.getByText('Sin paradas asignadas')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('con datos: cada parada en su orden con su avance y su hora estimada', () => {
    render(
      <VehicleStopsLine
        stops={[
          liveStop({ orderId: 'o-1', sequence: 1, progress: 'delivered' }),
          liveStop({ orderId: 'o-2', sequence: 2, progress: 'on_the_way', customerName: 'Bruno Díaz' }),
          liveStop({ orderId: 'o-3', sequence: null, progress: 'failed', customerName: null, etaAt: null }),
          liveStop({ orderId: 'o-4', source: 'order', sequence: null, customerName: 'Dana', etaAt: null }),
        ]}
        detailed
      />,
    );
    const items = within(screen.getByRole('list', { name: 'Paradas' })).getAllByRole('listitem');
    expect(items.map((li) => li.dataset.progress)).toEqual(['delivered', 'on_the_way', 'failed', 'pending']);
    expect(items[0]).toHaveTextContent('1. Ana Gómez');
    expect(items[0]).toHaveTextContent('Entregada');
    // La hora estimada, en hora argentina.
    expect(items[1]).toHaveTextContent('13:30');
    expect(items[1]).toHaveTextContent('Av. Mitre 123');
    expect(items[2]).toHaveTextContent('Cliente sin nombre');
    expect(items[2]).toHaveTextContent('No entregada');
    // Un pedido fuera de una hoja no tiene hora: se dice su estado.
    expect(items[3]).toHaveTextContent('Pendiente');
  });

  it('con tope muestra desde la parada en camino y resume el resto', () => {
    render(<VehicleStopsLine stops={five} max={2} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Tres'),
      expect.stringContaining('Cuatro'),
    ]);
    expect(screen.getByText('2 paradas anteriores')).toBeInTheDocument();
    expect(screen.getByText('y 1 parada más')).toBeInTheDocument();
  });

  it('con todo entregado y tope, muestra las primeras y cuántas más hay', () => {
    const done = five.map((stop) => ({ ...stop, progress: 'delivered' as const }));
    render(<VehicleStopsLine stops={done} max={3} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('y 2 paradas más')).toBeInTheDocument();
    expect(screen.queryByText(/anterior/)).not.toBeInTheDocument();
  });

  it('con `onSelect` cada parada es un botón y marca la elegida', () => {
    const onSelect = vi.fn();
    render(<VehicleStopsLine stops={five} detailed selectedId="o-4" onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[3]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(buttons[2]);
    expect(onSelect).toHaveBeenCalledWith('o-3');
  });
});
