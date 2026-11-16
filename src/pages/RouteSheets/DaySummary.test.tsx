import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteSheetPath } from '../../services/api/types';
import { planDay, sheet, stop, unassigned, uuid } from '../../test/routeSheetFixtures';

const state = vi.hoisted(() => ({
  paths: [] as (RouteSheetPath | null)[],
  askedPaths: [] as string[][],
}));
vi.mock('../../services/queries/routeSheets', () => ({
  useCachedRouteSheetPaths: (ids: string[]) => {
    state.askedPaths.push(ids);
    return state.paths;
  },
}));

import { DaySummary } from './DaySummary';

const path = (meters: number) => ({ provider: 'google', distanceMeters: meters }) as RouteSheetPath;
const day = planDay({
  sheets: [
    sheet({ id: uuid(1), status: 'draft', stops: [stop(1), stop(2)], totals: { ...sheet().totals, distanceKm: 10 } }),
    sheet({ id: uuid(2), status: 'confirmed', stops: [stop(3)], totals: { ...sheet().totals, distanceKm: 5.5 } }),
    sheet({ id: uuid(3), status: 'assigned', stops: [], totals: { ...sheet().totals, distanceKm: 0 } }),
  ],
  unassigned: [unassigned(1), unassigned(2, { blockedReason: 'capacity' })],
  emptiesExpected: 6,
});

const card = (title: string) => screen.getByText(title).closest('article, section > *') as HTMLElement;

beforeEach(() => {
  state.paths = [path(12000), path(9500)];
  state.askedPaths = [];
});
afterEach(cleanup);

describe('DaySummary', () => {
  it('pedidos en hojas y sin asignar, hojas propuestas y confirmadas y envases a retirar', () => {
    render(<DaySummary day={day} />);
    const summary = screen.getByRole('region', { name: 'Resumen del día' });
    expect(within(summary).getByText('5')).toBeInTheDocument();
    expect(within(summary).getByText('3 en hojas · 2 sin asignar')).toBeInTheDocument();
    expect(within(summary).getByText('1 sin poder ir en una hoja')).toBeInTheDocument();
    expect(within(summary).getByText('1 propuesta · 2 confirmadas')).toBeInTheDocument();
    expect(card('Envases a retirar')).toHaveTextContent('6');
    expect(card('Envases a retirar')).toHaveTextContent('vacías del canje en 2 hojas');
  });

  it('con todos los recorridos ya trazados, los km son por calles (y sólo se miran las hojas con paradas)', () => {
    render(<DaySummary day={day} />);
    expect(state.askedPaths.at(-1)).toEqual([uuid(1), uuid(2)]);
    expect(card('Kilómetros por calles')).toHaveTextContent('21,5 km');
  });

  it('si falta trazar alguno, el estimado del plan con su nombre', () => {
    state.paths = [path(12000), null];
    render(<DaySummary day={day} />);
    expect(screen.queryByText('Kilómetros por calles')).not.toBeInTheDocument();
    expect(card('Kilómetros estimados')).toHaveTextContent('15,5 km');
  });
});
