import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InboxConversation } from '../../../services/api/types';
import { ConversationContext } from './ConversationContext';

vi.mock('../../../services/queries/peoplePhotos', () => ({
  usePersonPhoto: () => ({ data: null, refetch: vi.fn() }),
}));
vi.mock('../../../services/queries/inbox', () => ({
  useChatSettings: () => ({ data: { firstResponseTargetMinutes: 30 } }),
}));
vi.mock('../../../services/queries/claims', () => ({
  useClaim: () => ({ data: undefined, isPending: true, error: null }),
}));

const base = {
  id: 'c-1',
  channel: 'staff_driver',
  subjectType: 'general',
  order: null,
  counterpart: { party: 'driver', displayName: 'Ramón Villalba' },
  customer: null,
  driver: { id: 'u-9', displayName: 'Ramón Villalba' },
  status: 'open',
  assignedTo: null,
  linkedClaimId: null,
  firstResponseAt: null,
  firstResponseBusinessMinutes: null,
  createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
} as unknown as InboxConversation;

const draw = (over: Partial<InboxConversation> = {}) =>
  render(
    <MemoryRouter>
      <ConversationContext conversation={{ ...base, ...over } as InboxConversation} />
    </MemoryRouter>,
  );

describe('ConversationContext', () => {
  afterEach(cleanup);

  it('la persona con su rol una sola vez y el tema', () => {
    draw();
    expect(screen.getByText('Ramón Villalba')).toBeInTheDocument();
    expect(screen.getAllByText('Chofer')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Chofer' })).not.toBeInTheDocument();
    expect(screen.getByText('Consulta general')).toBeInTheDocument();
  });

  it('sin asignar y sin responder: lo dice claro, con el objetivo', () => {
    draw();
    expect(screen.getByText('Sin asignar · en la cola')).toBeInTheDocument();
    expect(screen.getByText('Sin responder todavía')).toBeInTheDocument();
    expect(screen.getByText(/Objetivo: 30 min hábiles/)).toBeInTheDocument();
    expect(screen.getByText(/hace 12m/)).toBeInTheDocument();
  });

  it('respondida dentro y fuera del objetivo', () => {
    draw({
      assignedTo: { userId: 'a-1', fullName: 'Ana Gómez' },
      firstResponseAt: new Date().toISOString(),
      firstResponseBusinessMinutes: 12,
    } as Partial<InboxConversation>);
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
    expect(screen.getByText(/Dentro del objetivo/)).toBeInTheDocument();
  });
});
