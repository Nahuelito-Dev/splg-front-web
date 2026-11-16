import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const availability = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/timeSlots', () => ({
  useTimeSlotAvailability: (day: string) => availability(day) as unknown,
}));

import { SlotAvailabilityPanel } from './SlotAvailabilityPanel';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('SlotAvailabilityPanel', () => {
  it('arranca en el día argentino: a las 22:00 ART del 2/11 (01:00Z del 3/11) consulta el 2/11', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T01:00:00Z'));
    availability.mockReturnValue({ data: [], isPending: false });
    render(<SlotAvailabilityPanel />);
    expect(availability).toHaveBeenCalledWith('2026-11-02');
    expect(availability).not.toHaveBeenCalledWith('2026-11-03');
  });
});
