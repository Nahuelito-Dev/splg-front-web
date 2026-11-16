import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InboxConversation } from '../../../services/api/types';
import { ConversationContext } from './ConversationContext';
import { hasConversationContext } from './hasConversationContext';

vi.mock('../../../services/queries/claims', () => ({
  useClaim: () => ({
    data: { reason: 'Garrafa con pérdida', status: 'open', description: 'Olor a gas' },
    isPending: false,
    error: null,
  }),
}));

const base = {
  id: 'c-1',
  channel: 'staff_customer',
  subjectType: 'general',
  order: null,
  linkedClaimId: null,
} as unknown as InboxConversation;

describe('ConversationContext', () => {
  afterEach(cleanup);

  it('sin pedido ni reclamo no hay nada para mostrar al costado', () => {
    expect(hasConversationContext(base)).toBe(false);
  });

  it('con pedido y reclamo muestra los dos, sin repetir la persona', () => {
    const conversation = {
      ...base,
      order: { id: 'o-1', number: '1024', status: 'pending' },
      linkedClaimId: 'cl-1',
    } as unknown as InboxConversation;
    expect(hasConversationContext(conversation)).toBe(true);
    render(
      <MemoryRouter>
        <ConversationContext conversation={conversation} />
      </MemoryRouter>,
    );
    expect(screen.getByText('#1024')).toBeInTheDocument();
    expect(screen.getByText('Garrafa con pérdida')).toBeInTheDocument();
    expect(screen.queryByText('Atención')).not.toBeInTheDocument();
  });
});
