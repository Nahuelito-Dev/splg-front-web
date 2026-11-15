import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../../test/chatFixtures';
import { inboxMsg } from '../../../test/inboxFixtures';
import type { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../services/api/errors';
import type { MessagesQuery } from '../../../services/api/supportChat';
import type { InboxMessage } from '../../../services/api/types';
import type { OutgoingMessage } from '../../../services/queries/chatThread';
import { toChatMessage } from '../thread';
import { typingStore } from '../typing';
import { useInboxBridge } from '../useInboxBridge';
import { ChatThread } from './ChatThread';

const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn() }));
vi.mock('../../../utils/notifications', () => ({ notify: notifications }));

afterEach(() => {
  cleanup();
  typingStore.reset();
  sessionStorage.clear();
  Object.values(notifications).forEach((fn) => fn.mockClear());
});

const Bridge = () => {
  useInboxBridge(true);
  return null;
};

const QUICK = [
  {
    id: 'tpl-1',
    key: 'en_camino',
    title: 'Pedido en camino',
    body: 'Hola {{cliente.nombre}}, tu pedido salió',
    active: true,
  },
];

interface Setup {
  client?: QueryClient;
  /** Lo que devuelve la API por pedido (la última página, `afterSeq`, `beforeSeq`). */
  fetch?: (q: MessagesQuery) => InboxMessage[];
  send?: (m: OutgoingMessage) => Promise<InboxMessage>;
  edit?: (id: string, body: string) => Promise<InboxMessage>;
  variables?: Record<string, string | null>;
}

const own = (seq: number, over: Partial<InboxMessage> = {}) =>
  inboxMsg(seq, {
    party: 'company',
    isMine: true,
    canEdit: true,
    sender: { displayName: 'Ana' },
    body: `propio ${seq}`,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    ...over,
  });

const mount = ({ client = newQueryClient(), fetch, send, edit, variables }: Setup = {}) => {
  const socket = fakeSocket();
  const fetchFn = vi.fn((q: MessagesQuery) =>
    Promise.resolve({ items: (fetch ? fetch(q) : [inboxMsg(1), own(2)]).map(toChatMessage), hasMore: false }),
  );
  const sendFn = vi.fn(
    send ??
      ((m: OutgoingMessage) =>
        Promise.resolve(own(9, { body: m.body ?? '', clientMessageId: m.clientMessageId, canEdit: true }))),
  );
  const editFn = vi.fn(edit ?? ((_id: string, body: string) => Promise.resolve(own(2, { body, editedAt: 'x' }))));
  const view = render(
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
        }}
        canWrite
        quickReplies={QUICK}
        allowReply
        variables={variables}
        empty={<p>vacío</p>}
      />
    </ChatProviders>,
  );
  return { ...view, client, socket, fetchFn, sendFn, editFn };
};

const composer = () => screen.getByRole('textbox', { name: 'Mensaje' });
const type = (text: string) => fireEvent.change(composer(), { target: { value: text } });
const enter = () => fireEvent.keyDown(composer(), { key: 'Enter' });
const log = () => screen.getByRole('log', { name: 'Mensajes' });
/** Espera a que el hilo esté cargado y busca adentro. */
const inLog = async (text: string) => within(await screen.findByRole('log', { name: 'Mensajes' })).findByText(text);

describe('Corrección 1 · 1: lo editado o borrado fuera de la sala se ve al volver', () => {
  it('al volver a un hilo en caché, relee la última página y reemplaza por `seq`', async () => {
    const client = newQueryClient();
    const first = mount({ client });
    expect(await inLog('hola 1')).toBeInTheDocument();
    first.unmount();
    // Mientras no se miraba: el cliente borró el 1 y el panel (otra pestaña) editó el 2. No llegó ningún aviso.
    mount({
      client,
      fetch: (q) =>
        q.beforeSeq
          ? [inboxMsg(1, { body: null, deleted: true }), own(2, { body: 'propio corregido', editedAt: 'x' })]
          : [],
    });
    expect(await inLog('Mensaje eliminado')).toBeInTheDocument();
    expect(within(log()).getByText('propio corregido')).toBeInTheDocument();
    expect(within(log()).queryByText('hola 1')).not.toBeInTheDocument();
  });

  it('el banner «Respondés a…» muestra «Mensaje eliminado» si el citado se borra', async () => {
    const { socket } = mount();
    await inLog('hola 1');
    fireEvent.click(screen.getAllByRole('button', { name: /Responder al mensaje/ })[0]);
    expect(screen.getByText('Respondés a Lucía Benítez').nextSibling).toHaveTextContent('hola 1');
    act(() =>
      socket.fire('chat:message-deleted', {
        conversationId: 'conv-1',
        distributorId: 'd',
        seq: 1,
        message: inboxMsg(1, { body: null, deleted: true }),
      }),
    );
    await waitFor(() =>
      expect(screen.getByText('Respondés a Lucía Benítez').nextSibling).toHaveTextContent('Mensaje eliminado'),
    );
  });
});

describe('Corrección 1 · 2: nunca sale una `{{variable}}` literal', () => {
  const choose = () => {
    type('/');
    fireEvent.keyDown(composer(), { key: 'Enter' });
  };

  it('retocada, completa las variables con los datos de la conversación y no manda el `templateId`', async () => {
    const { sendFn } = mount({ variables: { 'cliente.nombre': 'Lucía', 'pedido.numero': null } });
    await inLog('hola 1');
    choose();
    type('Hola {{cliente.nombre}}, tu pedido salió recién');
    enter();
    await waitFor(() => expect(sendFn).toHaveBeenCalledTimes(1));
    expect(sendFn.mock.calls[0][0]).toMatchObject({ body: 'Hola Lucía, tu pedido salió recién' });
    expect(sendFn.mock.calls[0][0].templateId).toBeUndefined();
  });

  it('si una variable no tiene valor, no se envía y se pide completarla', async () => {
    const { sendFn } = mount({ variables: { 'cliente.nombre': 'Lucía', 'pedido.numero': null } });
    await inLog('hola 1');
    type('Tu pedido {{pedido.numero}} ya salió');
    enter();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Completá las variables antes de enviar: {{pedido.numero}}',
    );
    expect(composer()).toHaveAttribute('aria-invalid', 'true');
    expect(composer()).toHaveValue('Tu pedido {{pedido.numero}} ya salió');
    expect(sendFn).not.toHaveBeenCalled();
    type('Tu pedido 1A2B3C ya salió');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el reintento de un envío fallido manda el texto ya completado', async () => {
    let fail = true;
    const { sendFn } = mount({
      variables: { 'cliente.nombre': 'Lucía' },
      send: (m) =>
        fail
          ? Promise.reject(new Error('sin red'))
          : Promise.resolve(own(9, { body: m.body ?? '', clientMessageId: m.clientMessageId })),
    });
    await inLog('hola 1');
    type('Gracias {{cliente.nombre}}');
    enter();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    fail = false;
    await waitFor(() => expect(sendFn).toHaveBeenCalledTimes(2));
    expect(sendFn.mock.calls[1][0].body).toBe('Gracias Lucía');
    expect(sendFn.mock.calls[1][0].clientMessageId).toBe(sendFn.mock.calls[0][0].clientMessageId);
  });
});

describe('Corrección 1 · 3 y 4: editar no pisa ni ensucia el borrador', () => {
  it('lo que se estaba escribiendo vuelve al cancelar y al guardar la edición', async () => {
    mount();
    await inLog('propio 2');
    type('borrador a medias');
    fireEvent.click(screen.getByRole('button', { name: /Editar tu mensaje/ }));
    expect(composer()).toHaveValue('propio 2');
    fireEvent.keyDown(composer(), { key: 'Escape' });
    expect(composer()).toHaveValue('borrador a medias');
    fireEvent.click(screen.getByRole('button', { name: /Editar tu mensaje/ }));
    type('propio 2 corregido');
    enter();
    await waitFor(() => expect(screen.queryByText('Editando tu mensaje')).not.toBeInTheDocument());
    expect(composer()).toHaveValue('borrador a medias');
  });

  it('salir a mitad de una edición no deja el texto como borrador (Enter no lo manda duplicado)', async () => {
    const client = newQueryClient();
    const first = mount({ client });
    await inLog('propio 2');
    fireEvent.click(screen.getByRole('button', { name: /Editar tu mensaje/ }));
    type('propio 2 a medio editar');
    first.unmount();
    const again = mount({ client });
    await inLog('propio 2');
    expect(composer()).toHaveValue('');
    enter();
    expect(again.sendFn).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBeNull();
  });
});

describe('Corrección 1 · 8: «Editar» sólo mientras corresponde', () => {
  it('desaparece solo al vencer los 15 minutos', async () => {
    mount({ fetch: () => [own(2, { createdAt: new Date(Date.now() - 15 * 60_000 + 400).toISOString() })] });
    expect(await screen.findByRole('button', { name: /Editar tu mensaje/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Editar tu mensaje/ })).not.toBeInTheDocument(), {
      timeout: 2000,
    });
  });

  it('un 409 al guardar sale de la edición con aviso: Enter no vuelve a pegarle a la API', async () => {
    const { editFn } = mount({
      edit: () => Promise.reject(new ApiError(409, ['Pasaron los 15 minutos'], 'MESSAGE_EDIT_WINDOW_CLOSED')),
    });
    await inLog('propio 2');
    type('borrador');
    fireEvent.click(screen.getByRole('button', { name: /Editar tu mensaje/ }));
    type('propio 2 tarde');
    enter();
    await waitFor(() =>
      expect(notifications.warn).toHaveBeenCalledWith('Pasaron los 15 minutos. No se guardó la edición.'),
    );
    expect(screen.queryByText('Editando tu mensaje')).not.toBeInTheDocument();
    expect(composer()).toHaveValue('borrador');
    expect(editFn).toHaveBeenCalledTimes(1);
  });

  it('si el mensaje que se edita se borra, sale de la edición', async () => {
    const { socket } = mount();
    await inLog('propio 2');
    fireEvent.click(screen.getByRole('button', { name: /Editar tu mensaje/ }));
    act(() =>
      socket.fire('chat:message-deleted', {
        conversationId: 'conv-1',
        distributorId: 'd',
        seq: 2,
        message: own(2, { body: null, deleted: true }),
      }),
    );
    await waitFor(() => expect(screen.queryByText('Editando tu mensaje')).not.toBeInTheDocument());
    expect(notifications.warn).toHaveBeenCalled();
  });
});
