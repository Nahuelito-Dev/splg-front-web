import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { sheet } from '../../test/routeSheetFixtures';
import { LoadBar } from './LoadBar';

afterEach(cleanup);

const withLoad = (peakUnits: number, capacity: { units: number | null; kg: number | null }, weightKg = 0) =>
  sheet({ totals: { ...sheet().totals, peakUnits, weightKg }, capacity });

describe('LoadBar', () => {
  it('garrafas sobre la capacidad, en el tono normal hasta el 85 %', () => {
    render(<LoadBar sheet={withLoad(17, { units: 20, kg: null })} />);
    const meter = screen.getByRole('meter', { name: 'Carga del vehículo' });
    expect(meter).toHaveAttribute('aria-valuenow', '85');
    expect(meter).toHaveAttribute('aria-valuetext', '17 / 20 garrafas');
    expect(screen.getByTestId('load-bar-fill')).toHaveClass('bg-primary');
    expect(screen.getByTestId('load-bar-fill')).toHaveStyle({ width: '85%' });
  });

  it('arriba del 85 % va en advertencia', () => {
    render(<LoadBar sheet={withLoad(18, { units: 20, kg: null })} />);
    expect(screen.getByTestId('load-bar-fill')).toHaveClass('bg-warn');
    expect(screen.getByText('18 / 20 garrafas · 90 %')).toHaveClass('text-warn');
  });

  it('sin capacidad en garrafas usa los kg; pasada de la capacidad, la barra llega al tope', () => {
    render(<LoadBar sheet={withLoad(0, { units: null, kg: 500 }, 600)} />);
    expect(screen.getByText('600 / 500 kg · 120 %')).toBeInTheDocument();
    expect(screen.getByTestId('load-bar-fill')).toHaveStyle({ width: '100%' });
  });

  it('sin capacidad cargada no inventa un porcentaje', () => {
    render(<LoadBar sheet={withLoad(3, { units: null, kg: null })} />);
    expect(screen.getByRole('meter')).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByText(/sin capacidad cargada/)).toBeInTheDocument();
  });
});
