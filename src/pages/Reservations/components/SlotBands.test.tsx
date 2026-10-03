import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SlotAvailability } from '../../../services/api/types';
import { SlotBands } from './SlotBands';

afterEach(cleanup);

const slot = (patch: Partial<SlotAvailability>): SlotAvailability => ({
  timeSlotId: 's1',
  name: 'Mañana',
  startTime: '08:00:00',
  endTime: '12:00:00',
  capacity: 60,
  booked: 15,
  remaining: 45,
  ...patch,
});

describe('SlotBands', () => {
  it('muestra el cupo ocupado y libre de cada franja, ordenadas por hora', () => {
    render(
      <SlotBands
        slots={[slot({ timeSlotId: 's2', name: 'Tarde', startTime: '16:00:00', endTime: '20:00:00' }), slot({})]}
      />,
    );
    const names = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(names[0]).toContain('Mañana');
    expect(names[1]).toContain('Tarde');
    expect(screen.getAllByText('15 de 60 ocupados')).toHaveLength(2);
    expect(screen.getAllByText('45 libres')).toHaveLength(2);
    expect(screen.getAllByRole('progressbar')[0]).toHaveAttribute('aria-valuenow', '15');
  });

  it('marca la franja sin cupo como completa', () => {
    render(<SlotBands slots={[slot({ booked: 60, remaining: 0 })]} />);
    expect(screen.getByText('Completa')).toBeInTheDocument();
  });

  it('sin franjas lo dice, y mientras carga no dibuja nada', () => {
    const { rerender, container } = render(<SlotBands slots={[]} />);
    expect(screen.getByText('Sin franjas.')).toBeInTheDocument();
    rerender(<SlotBands slots={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
