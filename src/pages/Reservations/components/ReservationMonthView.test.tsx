import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReservationMonthView } from './ReservationMonthView';

afterEach(cleanup);

describe('ReservationMonthView', () => {
  it('no declara roles de grilla sueltos y nombra cada día con su fecha completa', () => {
    render(
      <ReservationMonthView anchor={new Date(2026, 9, 1)} byDay={new Map()} onOpen={vi.fn()} onPickDay={vi.fn()} />,
    );
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.queryByRole('gridcell')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver el día 5 de octubre' })).toBeInTheDocument();
  });
});
