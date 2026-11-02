import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/queries/deliveries', () => ({
  useDeliveryOptions: () => ({ data: [], isPending: false }),
}));
vi.mock('../../../services/queries/finance', () => ({
  useOpenDriverSettlement: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { OpenSettlementModal } from './OpenSettlementModal';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('OpenSettlementModal', () => {
  it('propone el día argentino: a las 22:00 ART del 2/11 (01:00Z del 3/11) es el 2/11', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T01:00:00Z'));
    render(
      <MemoryRouter>
        <OpenSettlementModal open onClose={vi.fn()} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>(/Día/).value).toBe('2026-11-02'));
  });
});
