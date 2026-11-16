import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/queries/fleet', () => ({ useCancelFleetTask: () => ({ mutate: vi.fn() }) }));
vi.mock('./FleetTaskAttachments', () => ({ FleetTaskAttachments: () => null }));
vi.mock('./FleetTaskPayment', () => ({ FleetTaskPayment: () => null }));

import type { FleetTask } from '../../../services/api/types';
import { FleetTaskDetailModal } from './FleetTaskDetailModal';

afterEach(cleanup);

const show = (scheduledAt: string) =>
  render(
    <FleetTaskDetailModal
      task={{ taskId: 't-1', status: 'open', scheduledAt, plan: { name: 'Service' } } as unknown as FleetTask}
      onClose={vi.fn()}
      canWrite={false}
      onEdit={vi.fn()}
      onRequestClose={vi.fn()}
    />,
  );

describe('FleetTaskDetailModal: turno agendado', () => {
  it('un turno a las 22:00 ART (01:00Z) se ve en el día argentino', () => {
    show('2026-11-11T01:00:00.000Z');
    expect(screen.getByText(/10 nov/i)).toBeTruthy();
  });

  it('una fila a medianoche UTC se ve en su día de calendario', () => {
    show('2026-11-11T00:00:00.000Z');
    expect(screen.getByText(/11 nov/i)).toBeTruthy();
  });
});
