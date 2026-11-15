import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sheet } from '../../test/routeSheetFixtures';
import { SheetCard } from './SheetCard';

afterEach(cleanup);

describe('SheetCard', () => {
  it('muestra la carga del vehículo y los envases que retira la hoja', () => {
    render(<SheetCard sheet={sheet({ totals: { ...sheet().totals, emptiesExpected: 4 } })} onOpen={vi.fn()} />);
    expect(screen.getByRole('meter', { name: 'Carga del vehículo' })).toBeInTheDocument();
    expect(screen.getByTestId('sheet-empties')).toHaveTextContent('Retira 4 envases en la hoja');
  });

  it('si la hoja no retira envases, no hay línea', () => {
    render(<SheetCard sheet={sheet()} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('sheet-empties')).not.toBeInTheDocument();
  });
});
