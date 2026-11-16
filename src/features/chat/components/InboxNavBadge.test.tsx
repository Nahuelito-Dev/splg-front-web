import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../../test/chatFixtures';
import type { InboxAccess } from '../useInboxAccess';

const access = vi.hoisted(() => ({
  value: { customers: true, drivers: true, configure: false, claims: false, any: true } as InboxAccess,
}));
const api = vi.hoisted(() => ({ getInboxSummary: vi.fn(), listConversations: vi.fn() }));
vi.mock('../useInboxAccess', () => ({ useInboxAccess: () => access.value }));
vi.mock('../../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));

import { INBOX_POLL_MS, inboxKeys } from '../../../services/queries/inbox';
import { useInboxBridge } from '../useInboxBridge';
import { InboxNavBadge } from './InboxNavBadge';

const Bridge = () => {
  useInboxBridge(true);
  return null;
};

const show = () => {
  const client = newQueryClient();
  const socket = fakeSocket();
  render(
    <ChatProviders client={client} socket={socket.value}>
      <Bridge />
      <InboxNavBadge mini={false} active={false} />
    </ChatProviders>,
  );
  return { client, socket };
};

beforeEach(() => {
  access.value = { customers: true, drivers: true, configure: false, claims: false, any: true };
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getInboxSummary.mockResolvedValue({
    unassigned: 3,
    mine: 1,
    awaitingHuman: 1,
    unread: 2,
    attention: 4,
    mentions: 0,
  });
});
afterEach(cleanup);

describe('InboxNavBadge: lo que pide atención en «Mensajes»', () => {
  it('sale del resumen de la bandeja (no de sumar mensajes de una página) y explica el número', async () => {
    show();
    const badge = await screen.findByLabelText(
      'Mensajes: 3 sin asignar, 1 esperando a alguien del equipo, 2 con mensajes sin leer',
    );
    // `attention` de la API: cada conversación una vez (no el mayor ni la suma de los otros números).
    expect(badge).toHaveTextContent('4');
    expect(api.listConversations).not.toHaveBeenCalled();
  });

  it('se relee con los avisos del socket y cada minuto de respaldo', async () => {
    const { client, socket } = show();
    await screen.findByText('4');
    expect(client.getQueryCache().find({ queryKey: inboxKeys.summary() })?.options).toMatchObject({
      refetchInterval: INBOX_POLL_MS,
    });
    api.getInboxSummary.mockResolvedValue({
      unassigned: 0,
      mine: 1,
      awaitingHuman: 0,
      unread: 5,
      attention: 5,
      mentions: 0,
    });
    act(() =>
      socket.fire('chat:inbox', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        channel: 'staff_customer',
        status: 'open',
        change: 'message',
        assignedToUserId: null,
        lastMessage: null,
      }),
    );
    await waitFor(() => expect(screen.getByLabelText('Mensajes: 5 con mensajes sin leer')).toHaveTextContent('5'));
  });

  it('sin nada pendiente no se muestra; sin permiso de mensajes no pide nada', async () => {
    api.getInboxSummary.mockResolvedValue({
      unassigned: 0,
      mine: 2,
      awaitingHuman: 0,
      unread: 0,
      attention: 0,
      mentions: 0,
    });
    show();
    await waitFor(() => expect(api.getInboxSummary).toHaveBeenCalled());
    expect(screen.queryByLabelText(/Mensajes:/)).not.toBeInTheDocument();
    cleanup();
    access.value = { customers: false, drivers: false, configure: false, claims: false, any: false };
    api.getInboxSummary.mockClear();
    show();
    expect(api.getInboxSummary).not.toHaveBeenCalled();
  });
});
