import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VehicleLoadBar } from './VehicleLoadBar';

afterEach(cleanup);

const load = (over: Partial<Parameters<typeof VehicleLoadBar>[0]['load']> = {}) => ({
  fullUnits: 20,
  emptyUnits: 12,
  defectiveUnits: 1,
  unitsOnBoard: 33,
  capacityUnits: 40 as number | null,
  percent: 83 as number | null,
  ...over,
});
const vehicle = { carId: 'car-1', photoUrl: 'https://fotos.test/hilux.jpg', typeCar: 'Camioneta' };

const widths = () =>
  ['full', 'empty', 'defective'].map((kind) => screen.getByTestId(`vehicle-load-${kind}`).style.width);
const legend = () =>
  within(screen.getByRole('list', { name: 'Envases a bordo' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

describe('VehicleLoadBar', () => {
  it('con los tres tipos: un tramo por tipo con su color, la leyenda y el total sobre la capacidad', () => {
    render(<VehicleLoadBar load={load()} vehicle={vehicle} />);
    // Cada tramo mide lo que ocupa de la capacidad (40): 20, 12 y 1.
    expect(widths()).toEqual(['50%', '30%', '2.5%']);
    expect(screen.getByTestId('vehicle-load-full').className).toContain('bg-primary');
    expect(screen.getByTestId('vehicle-load-empty').className).toContain('bg-accent');
    expect(screen.getByTestId('vehicle-load-defective').className).toContain('bg-danger');
    expect(legend()).toEqual(['Llenas20', 'Vacías12', 'Defectuosas1']);
    expect(screen.getByTestId('vehicle-load-total')).toHaveTextContent('33 de 40 envases');
    const meter = screen.getByRole('meter', { name: 'Carga del vehículo' });
    expect(meter).toHaveAttribute('aria-valuenow', '83');
    expect(meter).toHaveAttribute('aria-valuetext', '33 de 40 envases, 83 %: 20 llenas, 12 vacías, 1 defectuosa');
  });

  it('el porcentaje es el que manda el back, no uno calculado acá', () => {
    // 33 de 40 daría 83: si el back dice 77, se muestra 77.
    render(<VehicleLoadBar load={load({ percent: 77 })} vehicle={vehicle} />);
    expect(screen.getByTestId('vehicle-load-percent')).toHaveTextContent('77 %');
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '77');
  });

  it('en el detalle va sobre la foto real del vehículo; sin foto, sobre el ícono', () => {
    const { container, rerender } = render(<VehicleLoadBar load={load()} vehicle={vehicle} />);
    expect(container.querySelector('img[src="https://fotos.test/hilux.jpg"]')).not.toBeNull();
    rerender(<VehicleLoadBar load={load()} vehicle={{ ...vehicle, photoUrl: null }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('vehicle-photo-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('vehicle-load-percent')).toHaveTextContent('83 %');
  });

  it('tope visual al 100 %: excedido, los tramos se reparten la barra sin desbordarla', () => {
    render(
      <VehicleLoadBar
        load={load({ fullUnits: 30, emptyUnits: 15, defectiveUnits: 5, unitsOnBoard: 50, percent: 125 })}
        vehicle={vehicle}
      />,
    );
    expect(widths()).toEqual(['60%', '30%', '10%']);
    const total = widths().reduce((sum, width) => sum + parseFloat(width), 0);
    expect(total).toBeLessThanOrEqual(100);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
    // El número sí dice la verdad.
    expect(screen.getByTestId('vehicle-load-percent')).toHaveTextContent('125 %');
    expect(screen.getByText('Lleva más envases de los que entran.')).toBeInTheDocument();
    expect(legend()).toEqual(['Llenas30', 'Vacías15', 'Defectuosas5']);
  });

  it('sin capacidad: las tres cantidades igual, sin barra ni porcentaje inventado', () => {
    render(<VehicleLoadBar load={load({ capacityUnits: null, percent: null })} vehicle={vehicle} />);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vehicle-load-full')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vehicle-load-percent')).not.toBeInTheDocument();
    expect(legend()).toEqual(['Llenas20', 'Vacías12', 'Defectuosas1']);
    expect(screen.getByTestId('vehicle-load-total')).toHaveTextContent('33 envases a bordo');
    expect(screen.getByText(/no tiene cargada la cantidad de garrafas que entran/)).toBeInTheDocument();
  });

  it('en la tarjeta va sola, sin foto: total, barra en tramos y leyenda; sin capacidad, sólo las cantidades', () => {
    const { container, rerender } = render(<VehicleLoadBar load={load()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('33 de 40 envases · 83 %')).toBeInTheDocument();
    expect(widths()).toEqual(['50%', '30%', '2.5%']);
    expect(legend()).toEqual(['Llenas20', 'Vacías12', 'Defectuosas1']);
    rerender(<VehicleLoadBar load={load({ capacityUnits: null, percent: null })} />);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.getByText('33 envases a bordo')).toBeInTheDocument();
    expect(legend()).toEqual(['Llenas20', 'Vacías12', 'Defectuosas1']);
  });

  it('vacío: los tramos en cero y las tres cantidades en cero', () => {
    render(
      <VehicleLoadBar load={load({ fullUnits: 0, emptyUnits: 0, defectiveUnits: 0, unitsOnBoard: 0, percent: 0 })} />,
    );
    expect(widths()).toEqual(['0%', '0%', '0%']);
    expect(legend()).toEqual(['Llenas0', 'Vacías0', 'Defectuosas0']);
  });
});
