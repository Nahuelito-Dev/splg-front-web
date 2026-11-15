import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../../test/chatFixtures';
import { inboxMsg } from '../../../test/inboxFixtures';
import type { InboxMessage } from '../../../services/api/types';
import type { OutgoingMessage } from '../../../services/queries/chatThread';
import { toChatMessage } from '../thread';
import { typingStore } from '../typing';
import { useInboxBridge } from '../useInboxBridge';
import { ChatThread } from './ChatThread';

vi.mock('../../../utils/notifications', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

afterEach(() => {
  cleanup();
  typingStore.reset();
  sessionStorage.clear();
  vi.useRealTimers();
});

const Bridge = () => {
  useInboxBridge(true);
  return null;
};

interface Setup {
  messages?: InboxMessage[];
  send?: (m: OutgoingMessage) => Promise<InboxMessage>;
  edit?: (id: string, body: string) => Promise<InboxMessage>;
  canWrite?: boolean;
}

const QUICK = [
  { id: 'tpl-1', key: 'en_camino', title: 'Pedido en camino', body: 'Tu pedido {{pedido.numero}} salió', active: true },
];

const setup = ({ messages = [inboxMsg(1), inboxMsg(2)], send, edit, canWrite = true }: Setup = {}) => {
  const client = newQueryClient();
  const socket = fakeSocket();
  const fetchFn = vi.fn(() => Promise.resolve({ items: messages.map(toChatMessage), hasMore: false }));
  const sendFn = vi.fn(
    send ??
      ((m: OutgoingMessage) =>
        Promise.resolve(
          inboxMsg(3, { body: m.body, isMine: true, party: 'company', clientMessageId: m.clientMessageId }),
        )),
  );
  const editFn = vi.fn(edit ?? ((_id: string, body: string) => Promise.resolve(inboxMsg(2, { body }))));
  render(
    <ChatProviders client={client} socket={socket.value}>
      <Bridge />
      <ChatThread
        side="company"
        source={{
          conversationId: 'conv-1',
          fetch: fetchFn,
          send: async (m) => toChatMessage(await sendFn(m)),
          edit: async (id, body) => toChatMessage(await editFn(id, body)),
        }}
        counterpartName="Lucía Benítez"
        ctx={{
          platformName: 'Gas Norte',
          variant: 'inbox',
          counterpartName: 'Lucía Benítez',
          partyName: (party) => (party === 'company' ? 'Equipo' : 'Lucía Benítez'),
          ticketHref: () => '/support',
          claimHref: (id) => `/claims?claim=${id}`,
        }}
        canWrite={canWrite}
        quickReplies={QUICK}
        allowReply
        empty={<p>vacío</p>}
      />
    </ChatProviders>,
  );
  return { socket, sendFn, editFn };
};

const composer = () => screen.getByRole('textbox', { name: 'Mensaje' });
const type = (text: string) => fireEvent.change(composer(), { target: { value: text } });
const enter = () => fireEvent.keyDown(composer(), { key: 'Enter' });

describe('Bandeja: citar (D-C25)', () => {
  it('«Responder» muestra la cita arriba del compositor y manda el `replyToSeq`', async () => {
    const { sendFn } = setup();
    await screen.findByText('hola 2');
    fireEvent.click(screen.getAllByRole('button', { name: /Responder al mensaje/ })[0]);
    expect(screen.getByText('Respondés a Lucía Benítez')).toBeInTheDocument();
    expect(composer()).toHaveFocus();
    type('ya va');
    enter();
    await waitFor(() => expect(sendFn).toHaveBeenCalledTimes(1));
    expect(sendFn.mock.calls[0][0]).toMatchObject({ body: 'ya va', replyToSeq: 1 });
    expect(screen.queryByText('Respondés a Lucía Benítez')).not.toBeInTheDocument();
  });

  it('Esc cancela la cita y el envío sale sin `replyToSeq`', async () => {
    const { sendFn } = setup();
    await screen.findByText('hola 2');
    fireEvent.click(screen.getAllByRole('button', { name: /Responder al mensaje/ })[1]);
    fireEvent.keyDown(composer(), { key: 'Escape' });
    expect(screen.queryByText(/Respondés a/)).not.toBeInTheDocument();
    type('sin cita');
    enter();
    await waitFor(() => expect(sendFn).toHaveBeenCalledTimes(1));
    expect(sendFn.mock.calls[0][0].replyToSeq).toBeUndefined();
  });

  it('un mensaje que responde a otro muestra la cita con quién y su vista previa', async () => {
    setup({
      messages: [
        inboxMsg(1),
        inboxMsg(2, {
          party: 'company',
          isMine: true,
          sender: { displayName: 'Ana' },
          replyTo: { seq: 1, party: 'customer', preview: 'hola 1' },
        }),
      ],
    });
    const quote = await screen.findByRole('button', { name: /Responde a Lucía Benítez: hola 1/ });
    expect(quote).toBeInTheDocument();
  });

  it('sin poder escribir no se ofrece responder', async () => {
    setup({ canWrite: false });
    await screen.findByText('hola 2');
    expect(screen.queryByRole('button', { name: /Responder al mensaje/ })).not.toBeInTheDocument();
  });
});

describe('Bandeja: editar el propio (D-C22)', () => {
  const own = (over: Partial<InboxMessage> = {}) =>
    inboxMsg(2, {
      party: 'company',
      isMine: true,
      canEdit: true,
      sender: { displayName: 'Ana' },
      body: 'mensjae con error',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      ...over,
    });

  it('«Editar» carga el texto, guarda con PATCH y muestra «editado»', async () => {
    const { editFn, sendFn } = setup({
      messages: [inboxMsg(1), own()],
      edit: (_id, body) => Promise.resolve(own({ body, editedAt: new Date().toISOString() })),
    });
    fireEvent.click(await screen.findByRole('button', { name: /Editar tu mensaje/ }));
    expect(screen.getByText('Editando tu mensaje')).toBeInTheDocument();
    expect(composer()).toHaveValue('mensjae con error');
    type('mensaje con error');
    enter();
    await waitFor(() => expect(editFn).toHaveBeenCalledWith('im-2', 'mensaje con error'));
    expect(sendFn).not.toHaveBeenCalled();
    expect(await screen.findByText('mensaje con error')).toBeInTheDocument();
    expect(screen.getByText('editado ·')).toBeInTheDocument();
  });

  it('pasados los 15 minutos, o sin `canEdit`, no se ofrece', async () => {
    setup({
      messages: [
        own({ id: 'a', seq: 1, createdAt: new Date(Date.now() - 16 * 60_000).toISOString() }),
        own({ canEdit: false }),
      ],
    });
    await screen.findAllByText('mensjae con error');
    expect(screen.queryByRole('button', { name: /Editar tu mensaje/ })).not.toBeInTheDocument();
  });

  it('si la API lo rechaza (409), avisa y el texto vuelve al compositor', async () => {
    const { notify } = await import('../../../utils/notifications');
    setup({ messages: [own()], edit: () => Promise.reject(new Error('Pasaron los 15 minutos')) });
    fireEvent.click(await screen.findByRole('button', { name: /Editar tu mensaje/ }));
    type('corregido');
    enter();
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(composer()).toHaveValue('corregido');
    expect(screen.getByText('Editando tu mensaje')).toBeInTheDocument();
  });
});

describe('Bandeja: en vivo por el socket', () => {
  it('un mensaje nuevo del cliente entra al hilo', async () => {
    const { socket } = setup();
    await screen.findByText('hola 2');
    act(() =>
      socket.fire('chat:message', { conversationId: 'conv-1', distributorId: 'd-1', seq: 3, message: inboxMsg(3) }),
    );
    expect(await screen.findByText('hola 3')).toBeInTheDocument();
  });

  it('«editado» y «Mensaje eliminado» llegan en vivo en su lugar, sin el texto borrado', async () => {
    const { socket } = setup();
    await screen.findByText('hola 2');
    act(() =>
      socket.fire('chat:message-edited', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        seq: 1,
        message: inboxMsg(1, { body: 'hola, corregido', editedAt: '2026-11-15T13:05:00.000Z' }),
      }),
    );
    expect(await screen.findByText('hola, corregido')).toBeInTheDocument();
    act(() =>
      socket.fire('chat:message-deleted', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        seq: 2,
        message: inboxMsg(2, { body: null, deleted: true, deletedAt: '2026-11-15T13:06:00.000Z' }),
      }),
    );
    expect(await screen.findByText('Mensaje eliminado')).toBeInTheDocument();
    expect(screen.queryByText('hola 2')).not.toBeInTheDocument();
    const log = screen.getByRole('log', { name: 'Mensajes' });
    expect(within(log).getAllByRole('listitem')).toHaveLength(3); // separador del día + los dos mensajes en su lugar
  });

  it('«escribiendo…» del cliente se muestra con su nombre', async () => {
    const { socket } = setup();
    await screen.findByText('hola 2');
    act(() =>
      socket.fire('chat:typing', {
        conversationId: 'conv-1',
        party: 'customer',
        until: new Date(Date.now() + 5000).toISOString(),
      }),
    );
    expect(await screen.findByText('Lucía Benítez está escribiendo…')).toBeInTheDocument();
  });

  it('los avisos de sistema de la bandeja tienen su texto (reclamo con enlace)', async () => {
    setup({
      messages: [
        inboxMsg(1, {
          kind: 'system',
          party: 'system',
          systemCode: 'claim_created',
          payload: { claimId: 'cl-1' },
          body: null,
        }),
        inboxMsg(2, { kind: 'system', party: 'system', systemCode: 'reopened', body: null }),
      ],
    });
    expect(await screen.findByText(/Se creó un reclamo desde esta conversación/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver reclamo' })).toHaveAttribute('href', '/claims?claim=cl-1');
    expect(screen.getByText('Se reabrió la conversación')).toBeInTheDocument();
  });
});

describe('Bandeja: respuestas guardadas', () => {
  it('elegida con «/» y sin tocar, sale su `templateId` (el back completa las variables)', async () => {
    const { sendFn } = setup();
    await screen.findByText('hola 2');
    type('/');
    fireEvent.keyDown(composer(), { key: 'Enter' });
    expect(composer()).toHaveValue('Tu pedido {{pedido.numero}} salió');
    enter();
    await waitFor(() => expect(sendFn).toHaveBeenCalledTimes(1));
    expect(sendFn.mock.calls[0][0]).toMatchObject({ templateId: 'tpl-1' });
  });

  it('si se modifica el texto, sale como texto propio', async () => {
    const { sendFn } = setup();
    await screen.findByText('hola 2');
    type('/');
    fireEvent.keyDown(composer(), { key: 'Enter' });
    type('Tu pedido 1A2B salió recién');
    enter();
    await waitFor(() => expect(sendFn).toHaveBeenCalledTimes(1));
    expect(sendFn.mock.calls[0][0].templateId).toBeUndefined();
    expect(sendFn.mock.calls[0][0].body).toBe('Tu pedido 1A2B salió recién');
  });
});
