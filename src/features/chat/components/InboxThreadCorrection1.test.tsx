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
      expect(notifications.warn).toHaveBeenCalledWith(
        'Pasaron los 15 minutos. No se guardó la edición: tu texto quedó en el cuadro para enviarlo.',
      ),
    );
    expect(screen.queryByText('Editando tu mensaje')).not.toBeInTheDocument();
    // Ni el borrador que había ni lo editado se pierden: los dos quedan en el compositor.
    expect(composer()).toHaveValue('borrador\n\npropio 2 tarde');
    expect(editFn).toHaveBeenCalledTimes(1);
  });

  it.each([
    // El texto real del back termina en punto: el aviso no lo duplica.
    ['MESSAGE_ALREADY_QUOTED', 'No se puede editar: ya respondieron citando este mensaje.'],
    ['MESSAGE_LINKED_TO_CLAIM', 'El mensaje forma parte de un reclamo: no se puede editar'],
    ['MESSAGE_IN_ORDER_CONVERSATION', 'La conversación es por un pedido: sus mensajes no se editan'],
  ])(
    'un 409 %s: muestra el motivo, lo editado queda para reenviar y «Editar» deja de ofrecerse',
    async (code, text) => {
      let tied = false;
      const { editFn, sendFn } = mount({
        // Después del rechazo, la API ya no da `canEdit` para ese mensaje.
        fetch: () => [inboxMsg(1), own(2, { canEdit: !tied })],
        edit: () => {
          tied = true;
          return Promise.reject(new ApiError(409, [text], code));
        },
      });
      await inLog('propio 2');
      fireEvent.click(screen.getByRole('button', { name: /Editar tu mensaje/ }));
      type('propio 2 corregido');
      enter();
      await waitFor(() =>
        expect(notifications.warn).toHaveBeenCalledWith(
          `${text.replace(/\.$/, '')}. No se guardó la edición: tu texto quedó en el cuadro para enviarlo.`,
        ),
      );
      expect(screen.queryByText('Editando tu mensaje')).not.toBeInTheDocument();
      expect(composer()).toHaveValue('propio 2 corregido');
      expect(within(log()).getByText('propio 2')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('button', { name: /Editar tu mensaje/ })).not.toBeInTheDocument());
      // Lo rescatado es un borrador común: Enter lo manda como mensaje nuevo, no como edición.
      enter();
      await waitFor(() => expect(sendFn).toHaveBeenCalledTimes(1));
      expect(sendFn.mock.calls[0][0]).toMatchObject({ body: 'propio 2 corregido' });
      expect(editFn).toHaveBeenCalledTimes(1);
    },
  );

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

describe('Corrección 1 (bandeja-detalles) · el rescate de una edición rechazada no pisa nada', () => {
  const QUOTED = new ApiError(
    409,
    ['No se puede editar: ya respondieron citando este mensaje.'],
    'MESSAGE_ALREADY_QUOTED',
  );
  /** Un PATCH que contesta cuando el test quiere. */
  const deferredEdit = () => {
    let reject: (cause: unknown) => void = () => undefined;
    const edit = () => new Promise<InboxMessage>((_resolve, fail) => (reject = fail));
    return { edit, reject: (cause: unknown) => reject(cause) };
  };
  const twoOwn = () => [inboxMsg(1), own(2), own(3)];
  const editButtons = () => screen.getAllByRole('button', { name: /Editar tu mensaje/ });

  it('si mientras volvía el 409 se está editando otro mensaje, la edición de ese sigue intacta y lo rescatado se guarda', async () => {
    const pending = deferredEdit();
    const { editFn } = mount({ fetch: twoOwn, edit: pending.edit });
    await inLog('propio 3');
    type('borrador');
    fireEvent.click(editButtons()[0]);
    type('propio 2 corregido');
    enter();
    await waitFor(() => expect(editFn).toHaveBeenCalledTimes(1));
    // Mientras tanto, empieza a editar el 3.
    fireEvent.click(editButtons()[1]);
    type('propio 3 a medio editar');
    await act(() => Promise.resolve(pending.reject(QUOTED)));
    await waitFor(() =>
      expect(notifications.warn).toHaveBeenCalledWith(
        'No se puede editar: ya respondieron citando este mensaje. No se guardó la edición: tu texto quedó como borrador: vuelve al cuadro cuando termines de editar.',
      ),
    );
    expect(screen.getByText('Editando tu mensaje')).toBeInTheDocument();
    expect(composer()).toHaveValue('propio 3 a medio editar');
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBe('borrador\n\npropio 2 corregido');
    // Al salir de la edición del 3, vuelve el borrador con lo rescatado.
    fireEvent.keyDown(composer(), { key: 'Escape' });
    expect(composer()).toHaveValue('borrador\n\npropio 2 corregido');
  });

  it('si ya se salió del hilo, lo rescatado se guarda en el borrador de esa conversación', async () => {
    const pending = deferredEdit();
    const view = mount({ edit: pending.edit });
    await inLog('propio 2');
    type('borrador');
    fireEvent.click(screen.getByRole('button', { name: /Editar tu mensaje/ }));
    type('propio 2 corregido');
    enter();
    await waitFor(() => expect(view.editFn).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(() => Promise.resolve(pending.reject(QUOTED)));
    await waitFor(() =>
      expect(notifications.warn).toHaveBeenCalledWith(
        'No se puede editar: ya respondieron citando este mensaje. No se guardó la edición: tu texto quedó como borrador de esa conversación.',
      ),
    );
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBe('borrador\n\npropio 2 corregido');
  });

  it('lo escrito mientras volvía la respuesta no se pierde', async () => {
    const pending = deferredEdit();
    const { editFn } = mount({ edit: pending.edit });
    await inLog('propio 2');
    type('borrador');
    fireEvent.click(screen.getByRole('button', { name: /Editar tu mensaje/ }));
    type('propio 2 corregido');
    enter();
    await waitFor(() => expect(editFn).toHaveBeenCalledTimes(1));
    type('mientras tanto');
    await act(() => Promise.resolve(pending.reject(QUOTED)));
    await waitFor(() => expect(screen.queryByText('Editando tu mensaje')).not.toBeInTheDocument());
    expect(composer()).toHaveValue('borrador\n\nmientras tanto\n\npropio 2 corregido');
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBe('borrador\n\nmientras tanto\n\npropio 2 corregido');
  });
});
