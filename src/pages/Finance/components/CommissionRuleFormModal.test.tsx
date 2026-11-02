import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/queries/finance', () => ({
  useCreateCommissionRule: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCommissionRule: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../services/queries/employees', () => ({
  useEmployees: () => ({ data: { rows: [] }, isPending: false }),
}));
vi.mock('../../../services/queries/gasCylinders', () => ({
  useGasCylinders: () => ({ data: { rows: [] }, isPending: false }),
}));

import { CommissionRuleFormModal } from './CommissionRuleFormModal';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CommissionRuleFormModal', () => {
  it('precarga "Rige desde" con el día argentino: a las 22:00 ART del 2/11 (01:00Z del 3/11) es el 2/11', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T01:00:00Z'));
    render(<CommissionRuleFormModal open onClose={vi.fn()} rule={null} />);
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>(/Rige desde/).value).toBe('2026-11-02'));
  });
});
