import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, msg, newQueryClient } from '../../test/chatFixtures';
import { inboxConversation, inboxMsg } from '../../test/inboxFixtures';
import { inboxKeys } from '../../services/queries/inbox';
import { CHAT_ALERTS_KEY } from './alerts';
import { useInboxBridge } from './useInboxBridge';
import { useSupportChatBridge } from './useSupportChatBridge';

/** Una `Notification` falsa: registra lo que se mostró y lo que se cerró. */
class FakeNotification {
  static permission = 'granted';
  static shown: FakeNotification[] = [];
  closed = false;
  onclose: (() => void) | null = null;
  constructor(
    public title: string,
    public options: NotificationOptions = {},
  ) {
    FakeNotification.shown.push(this);
  }
  close() {
    this.closed = true;
  }
}

const Bridges = ({ support = true }: { support?: boolean }) => {
  useInboxBridge(true);
  useSupportChatBridge(support ? 'company' : null, 'Mensaje de OrixTech');
  return null;
};

const hide = (hidden: boolean) =>
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });

beforeEach(() => {
  FakeNotification.shown = [];
  vi.stubGlobal('Notification', FakeNotification);
  vi.stubGlobal(
    'AudioContext',
    vi.fn(() => {
      throw new Error('sin audio en el test');
    }),
  );
  localStorage.setItem(CHAT_ALERTS_KEY, '1');
  hide(true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  hide(false);
});

const setup = (support = true) => {
  const client = newQueryClient();
  const socket = fakeSocket();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <ChatProviders client={client} socket={socket.value}>
      <Bridges support={support} />
    </ChatProviders>,
  );
  /** Las relecturas que pidió cada puente (por la raíz de la clave). */
  const roots = () => invalidate.mock.calls.map(([filters]) => (filters?.queryKey as unknown[] | undefined)?.[0]);
  return { client, socket, roots };
};

const inboxEvent = (over: Record<string, unknown> = {}) => ({
  conversationId: 'conv-1',
  distributorId: 'd-1',
  channel: 'staff_customer',
  status: 'open',
  change: 'message',
  assignedToUserId: null,
  lastMessage: { seq: 3, at: '2026-11-15T13:03:00.000Z', party: 'customer', kind: 'text', preview: 'hola 3' },
  ...over,
});

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

describe('Corrección 1 · 6: aviso de una conversación que no está en pantalla', () => {
  it('con la pestaña oculta, `chat:inbox` de un cliente avisa «Nuevo mensaje de <nombre>» sin el texto', () => {
    const { client, socket } = setup();
    client.setQueryData(inboxKeys.detail('conv-1'), inboxConversation());
    act(() => socket.fire('chat:inbox', inboxEvent()));
    expect(FakeNotification.shown).toHaveLength(1);
    expect(FakeNotification.shown[0].title).toBe('Nuevo mensaje de Lucía Benítez');
    expect(FakeNotification.shown[0].options.body).toBeUndefined();
    expect(FakeNotification.shown[0].options.tag).toBe('chat:conv-1');
  });

  it('sin el nombre en caché dice «un chofer»; los propios, los de sistema y con el aviso apagado, nada', () => {
    const { socket } = setup();
    act(() =>
      socket.fire(
        'chat:inbox',
        inboxEvent({ channel: 'staff_driver', lastMessage: { ...inboxEvent().lastMessage, party: 'driver' } }),
      ),
    );
    expect(FakeNotification.shown.map((n) => n.title)).toEqual(['Nuevo mensaje de un chofer']);
    act(() =>
      socket.fire('chat:inbox', inboxEvent({ lastMessage: { ...inboxEvent().lastMessage, party: 'company' } })),
    );
    act(() => socket.fire('chat:inbox', inboxEvent({ change: 'assigned' })));
    localStorage.removeItem(CHAT_ALERTS_KEY);
    act(() => socket.fire('chat:inbox', inboxEvent()));
    expect(FakeNotification.shown).toHaveLength(1);
  });

  it('con la pestaña a la vista no avisa', () => {
    hide(false);
    const { socket } = setup();
    act(() => socket.fire('chat:inbox', inboxEvent()));
    expect(FakeNotification.shown).toHaveLength(0);
  });
});

describe('Corrección 1 · 10: la notificación de un mensaje borrado se cierra', () => {
  it('`chat:message-deleted` cierra la del mismo mensaje y no la de otro', () => {
    const { socket } = setup();
    act(() => socket.fire('chat:inbox', inboxEvent()));
    act(() =>
      socket.fire('chat:message-deleted', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        seq: 2,
        message: inboxMsg(2, { body: null, deleted: true }),
      }),
    );
    expect(FakeNotification.shown[0].closed).toBe(false);
    act(() =>
      socket.fire('chat:message-deleted', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        seq: 3,
        message: inboxMsg(3, { body: null, deleted: true }),
      }),
    );
    expect(FakeNotification.shown[0].closed).toBe(true);
  });
});

describe('Corrección 1 · 11: cada puente atiende sus canales', () => {
  it('lo de la bandeja no relee nada del chat con la plataforma, ni avisa con su título', async () => {
    const { socket, roots } = setup();
    act(() =>
      socket.fire('chat:message', { conversationId: 'conv-1', distributorId: 'd-1', seq: 3, message: inboxMsg(3) }),
    );
    act(() => socket.fire('chat:inbox', inboxEvent()));
    act(() =>
      socket.fire('chat:conversation', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        change: 'assigned',
        conversation: inboxConversation(),
      }),
    );
    act(() => socket.fire('chat:read', { conversationId: 'conv-1', party: 'customer', lastReadSeq: 3 }));
    await wait(400);
    expect(roots()).not.toContain('supportChat');
    expect(roots()).toContain('inbox');
    expect(FakeNotification.shown.map((n) => n.title)).not.toContain('Mensaje de OrixTech');
  });

  it('lo del chat con la plataforma no relee la bandeja', async () => {
    const { socket, roots } = setup();
    act(() =>
      socket.fire('chat:message', {
        conversationId: 'c-sup',
        distributorId: 'd-1',
        seq: 1,
        message: msg(1, { conversationId: 'c-sup' }),
      }),
    );
    act(() => socket.fire('chat:inbox', { ...inboxEvent({ conversationId: 'c-sup', channel: 'platform_chat' }) }));
    await wait(400);
    expect(roots()).toContain('supportChat');
    expect(roots()).not.toContain('inbox');
  });
});
