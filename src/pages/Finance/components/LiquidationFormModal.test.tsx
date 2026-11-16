import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/queries/employees', () => ({
  useEmployees: () => ({ data: { rows: [] }, isPending: false }),
}));
vi.mock('../../../services/queries/finance', () => ({
  useCreateDriverLiquidation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { LiquidationFormModal } from './LiquidationFormModal';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LiquidationFormModal', () => {
  it('propone el mes en curso hasta el día argentino: a las 22:00 ART del 30/11 (01:00Z del 1/12) es noviembre', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-01T01:00:00Z'));
    render(
      <MemoryRouter>
        <LiquidationFormModal open onClose={vi.fn()} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>(/Desde/).value).toBe('2026-11-01'));
    expect(screen.getByLabelText<HTMLInputElement>(/Hasta/).value).toBe('2026-11-30');
  });
});
