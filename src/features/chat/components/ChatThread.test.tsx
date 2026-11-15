import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, msg, newQueryClient } from '../../../test/chatFixtures';
import type { MessagesQuery } from '../../../services/api/supportChat';
import type { MessageDto, MessageList } from '../../../services/api/types';
import type { OutgoingMessage } from '../../../services/queries/chatThread';
import { useSupportChatBridge } from '../useSupportChatBridge';
import { typingStore } from '../typing';
import { ChatThread, type ChatThreadProps } from './ChatThread';

afterEach(() => {
  cleanup();
  typingStore.reset();
  sessionStorage.clear();
});

const page = (items: MessageDto[], hasMore = false): MessageList => ({ items, hasMore });

const Bridge = () => {
  useSupportChatBridge('company', 'Mensaje');
  return null;
};

interface Setup {
  fetch?: (query: MessagesQuery) => Promise<MessageList>;
  send?: (message: OutgoingMessage) => Promise<MessageDto>;
  read?: (seq: number) => Promise<void>;
  props?: Partial<ChatThreadProps>;
}

const setup = ({ fetch, send, read, props }: Setup = {}) => {
  const client = newQueryClient();
  const socket = fakeSocket();
  const fetchFn = vi.fn(fetch ?? (() => Promise.resolve(page([msg(1), msg(2)]))));
  const sendFn = vi.fn(send ?? ((m: OutgoingMessage) => Promise.resolve(msg(3, { body: m.body, isMine: true }))));
  const content = (
    <>
      <Bridge />
      <ChatThread
        side="company"
        source={{ conversationId: 'c-1', fetch: fetchFn, send: sendFn }}
        read={read}
        counterpartName="OrixTech"
        ctx={{ platformName: 'OrixTech', ticketHref: (id) => `/support/tickets/${id}` }}
        canWrite
        empty={<p>Escribinos y te respondemos</p>}
        {...props}
      />
    </>
  );
  const view = render(
    <ChatProviders client={client} socket={socket.value}>
      {content}
    </ChatProviders>,
  );
  /** Simula un corte y la vuelta de la conexión (el proveedor cambia `isOnline`). */
  const setOnline = (isOnline: boolean) =>
    view.rerender(
      <ChatProviders client={client} socket={{ ...socket.value, isOnline }}>
        {content}
      </ChatProviders>,
    );
  return { ...view, client, socket, fetchFn, sendFn, setOnline };
};

const log = () => screen.getByRole('log', { name: 'Mensajes' });
const composer = () => screen.getByRole('textbox', { name: 'Mensaje' });
const type = (text: string) => fireEvent.change(composer(), { target: { value: text } });
const enter = (shiftKey = false) => fireEvent.keyDown(composer(), { key: 'Enter', shiftKey });

describe('ChatThread: el hilo', () => {
  it('muestra los mensajes en un log accesible, con separador por día', async () => {
    setup();
    expect(await screen.findByText('mensaje 1')).toBeInTheDocument();
    expect(log()).toHaveAttribute('aria-live', 'polite');
    expect(within(log()).getByLabelText(/1[34] nov 2026|Hoy|Ayer/)).toBeInTheDocument();
  });

  it('mientras carga muestra el esqueleto, y si falla, el error con «Reintentar»', async () => {
    let fail = true;
    setup({ fetch: () => (fail ? Promise.reject(new Error('caído')) : Promise.resolve(page([msg(1)]))) });
    expect(screen.getByRole('status', { name: 'Cargando mensajes…' })).toBeInTheDocument();
    // El hilo reintenta una vez solo antes de mostrar el error.
    const retry = await screen.findByRole('button', { name: /Reintentar/ }, { timeout: 4000 });
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText('mensaje 1')).toBeInTheDocument();
  });

  it('sin mensajes, el vacío que le pasa la pantalla', async () => {
    setup({ fetch: () => Promise.resolve(page([])) });
    expect(await screen.findByText('Escribinos y te respondemos')).toBeInTheDocument();
  });

  it('el texto de un mensaje es texto: un <script> se ve tal cual y no se ejecuta', async () => {
    setup({ fetch: () => Promise.resolve(page([msg(1, { body: '<script>alert(1)</script> <b>hola</b>' })])) });
    expect(await screen.findByText('<script>alert(1)</script> <b>hola</b>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(log().querySelector('b')).toBeNull();
  });

  it('los enlaces abren aparte sin acceso a la página', async () => {
    setup({ fetch: () => Promise.resolve(page([msg(1, { body: 'mirá https://splg.com/ayuda' })])) });
    const link = await screen.findByRole('link', { name: 'https://splg.com/ayuda' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('los propios llevan ✓ y pasan a ✓✓ cuando la otra punta lee (chat:read)', async () => {
    const { socket } = setup({
      fetch: () => Promise.resolve(page([msg(1, { isMine: true, party: 'company' })])),
      props: { counterpartLastReadSeq: 0 },
    });
    expect(await screen.findByLabelText('Enviado')).toBeInTheDocument();
    act(() => socket.fire('chat:read', { conversationId: 'c-1', party: 'platform', lastReadSeq: 1 }));
    expect(await screen.findByLabelText('Leído')).toBeInTheDocument();
  });

  it('la hora tiene la fecha completa al pasar el mouse', async () => {
    setup({ fetch: () => Promise.resolve(page([msg(1)])) });
    await screen.findByText('mensaje 1');
    const time = log().querySelector('time');
    expect(time?.getAttribute('title')).toMatch(/2026/);
  });
});

describe('ChatThread: envío optimista (P1)', () => {
  it('la burbuja aparece al instante como «Enviando…» y el compositor queda vacío', async () => {
    let resolve: (m: MessageDto) => void = () => undefined;
    const { sendFn } = setup({ send: () => new Promise((r) => (resolve = r)) });
    await screen.findByText('mensaje 2');
    type('hola soporte');
    enter();
    expect(await within(log()).findByText('hola soporte')).toBeInTheDocument();
    expect(screen.getByText('Enviando…')).toBeInTheDocument();
    expect(composer()).toHaveValue('');
    const sent = sendFn.mock.calls[0][0];
    expect(sent.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
    act(() => resolve(msg(3, { body: 'hola soporte', isMine: true, clientMessageId: sent.clientMessageId })));
    await waitFor(() => expect(screen.queryByText('Enviando…')).not.toBeInTheDocument());
    expect(within(log()).getAllByText('hola soporte')).toHaveLength(1);
  });

  it('si falla, «No se envió · Reintentar» reintenta con el MISMO clientMessageId', async () => {
    let attempt = 0;
    const { sendFn } = setup({
      send: (m) => {
        attempt += 1;
        return attempt === 1
          ? Promise.reject(new Error('Network Error'))
          : Promise.resolve(msg(3, { body: m.body, isMine: true, clientMessageId: m.clientMessageId }));
      },
    });
    await screen.findByText('mensaje 2');
    type('¿siguen ahí?');
    enter();
    expect(await screen.findByText(/No se envió/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByText(/No se envió/)).not.toBeInTheDocument());
    expect(sendFn).toHaveBeenCalledTimes(2);
    expect(sendFn.mock.calls[1][0].clientMessageId).toBe(sendFn.mock.calls[0][0].clientMessageId);
  });

  it('descartar un envío fallido devuelve el texto al compositor', async () => {
    setup({ send: () => Promise.reject(new Error('Network Error')) });
    await screen.findByText('mensaje 2');
    type('borrador importante');
    enter();
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(composer()).toHaveValue('borrador importante');
  });

  it('lo que llega por el socket y lo que devolvió el envío no se duplica', async () => {
    const { socket } = setup();
    await screen.findByText('mensaje 2');
    type('una vez');
    enter();
    await waitFor(() => expect(screen.queryByText('Enviando…')).not.toBeInTheDocument());
    act(() => socket.fire('chat:message', { conversationId: 'c-1', seq: 3, message: msg(3, { body: 'una vez' }) }));
    expect(within(log()).getAllByText('una vez')).toHaveLength(1);
  });
});

describe('ChatThread: tiempo real y reconexión (P2, P3, P6)', () => {
  it('un mensaje nuevo del socket se agrega; un hueco se completa pidiendo lo posterior al último', async () => {
    const { socket, fetchFn } = setup();
    await screen.findByText('mensaje 2');
    act(() => socket.fire('chat:message', { conversationId: 'c-1', seq: 3, message: msg(3) }));
    expect(await screen.findByText('mensaje 3')).toBeInTheDocument();
    fetchFn.mockResolvedValueOnce(page([msg(4), msg(5)]));
    act(() => socket.fire('chat:message', { conversationId: 'c-1', seq: 5, message: msg(5) }));
    expect(await screen.findByText('mensaje 4')).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledWith({ afterSeq: 3, limit: 100 });
  });

  it('al reconectar vuelve a entrar a la sala y pide lo que pasó durante el corte (afterSeq)', async () => {
    const { socket, fetchFn, setOnline } = setup();
    await screen.findByText('mensaje 2');
    setOnline(false);
    fetchFn.mockResolvedValue(page([msg(3)]));
    setOnline(true);
    expect(await screen.findByText('mensaje 3')).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledWith({ afterSeq: 2, limit: 100 });
    const joins = (socket.value.request as ReturnType<typeof vi.fn>).mock.calls.filter(([e]) => e === 'chat:join');
    expect(joins.length).toBeGreaterThanOrEqual(2);
  });

  it('un mensaje de otra conversación no aparece', async () => {
    const { socket } = setup();
    await screen.findByText('mensaje 2');
    act(() =>
      socket.fire('chat:message', { conversationId: 'otra', seq: 3, message: msg(3, { conversationId: 'otra' }) }),
    );
    expect(screen.queryByText('mensaje 3')).not.toBeInTheDocument();
  });

  it('entra a la sala de la conversación con ack y sale al cerrar', async () => {
    const { socket, unmount } = setup();
    await screen.findByText('mensaje 2');
    expect(socket.value.request).toHaveBeenCalledWith('chat:join', { conversationId: 'c-1' });
    unmount();
    expect(socket.value.request).toHaveBeenCalledWith('chat:leave', { conversationId: 'c-1' });
  });

  it('«escribiendo…» de la otra punta hasta que llega su mensaje', async () => {
    const { socket } = setup();
    await screen.findByText('mensaje 2');
    act(() =>
      socket.fire('chat:typing', {
        conversationId: 'c-1',
        party: 'platform',
        until: new Date(Date.now() + 5000).toISOString(),
      }),
    );
    expect(await screen.findByText('OrixTech está escribiendo…')).toBeInTheDocument();
    act(() => socket.fire('chat:message', { conversationId: 'c-1', seq: 3, message: msg(3) }));
    await waitFor(() => expect(screen.queryByText('OrixTech está escribiendo…')).not.toBeInTheDocument());
  });

  it('al tipear avisa «escribiendo» con tope (uno cada 3 s)', async () => {
    const { socket } = setup();
    await screen.findByText('mensaje 2');
    type('h');
    type('ho');
    type('hol');
    expect(socket.value.emit).toHaveBeenCalledTimes(1);
    expect(socket.value.emit).toHaveBeenCalledWith('chat:typing', { conversationId: 'c-1' });
  });
});

describe('ChatThread: mensajes que llegan antes de la primera carga (corrección 1)', () => {
  /** Un GET que responde cuando el test quiere, con la foto de ese momento. */
  const slowFetch = () => {
    const waiting: ((page: MessageList) => void)[] = [];
    const fetchFn = vi.fn(() => new Promise<MessageList>((resolve) => waiting.push(resolve)));
    const answer = (items: MessageDto[]) => waiting.splice(0).forEach((resolve) => resolve(page(items)));
    return { fetchFn, answer };
  };

  it('un chat:message entre el join y la respuesta del GET no se pierde', async () => {
    const { fetchFn, answer } = slowFetch();
    const { socket } = setup({ fetch: fetchFn });
    await waitFor(() => expect(socket.value.request).toHaveBeenCalledWith('chat:join', { conversationId: 'c-1' }));
    act(() => socket.fire('chat:message', { conversationId: 'c-1', seq: 3, message: msg(3) }));
    // La foto del GET se tomó antes de ese mensaje.
    act(() => answer([msg(1), msg(2)]));
    expect(await screen.findByText('mensaje 3')).toBeInTheDocument();
    expect(screen.getByText('mensaje 1')).toBeInTheDocument();
  });

  it('si entre la foto y lo que llegó falta algo, lo pide con afterSeq', async () => {
    const { fetchFn, answer } = slowFetch();
    const { socket } = setup({ fetch: fetchFn });
    await waitFor(() => expect(socket.value.request).toHaveBeenCalledWith('chat:join', { conversationId: 'c-1' }));
    act(() => socket.fire('chat:message', { conversationId: 'c-1', seq: 4, message: msg(4) }));
    act(() => answer([msg(1), msg(2)]));
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith({ afterSeq: 2, limit: 100 }));
    act(() => answer([msg(3), msg(4)]));
    // Después de lo posterior, relee la última página que ya tiene (lo editado o borrado mientras tanto).
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith({ beforeSeq: 5, limit: 50 }));
    act(() => answer([msg(3), msg(4)]));
    expect(await screen.findByText('mensaje 3')).toBeInTheDocument();
    expect(screen.getByText('mensaje 4')).toBeInTheDocument();
  });
});

describe('ChatThread: entre la foto del GET y la entrada a la sala (corrección 2)', () => {
  it('foto en seq 2 → ack del join → GET resuelve → afterSeq trae seq 3 y aparece', async () => {
    let answerFirst: (p: MessageList) => void = () => undefined;
    const fetchFn = vi.fn((q: MessagesQuery) =>
      q.afterSeq === undefined && q.beforeSeq === undefined
        ? new Promise<MessageList>((resolve) => (answerFirst = resolve))
        : Promise.resolve(q.afterSeq === 2 ? page([msg(3)]) : page([])),
    );
    let ackJoin: (ack: { ok: true }) => void = () => undefined;
    const client = newQueryClient();
    const socket = fakeSocket();
    socket.value.request = vi.fn((event: string) =>
      event === 'chat:join'
        ? new Promise<{ ok: true }>((resolve) => (ackJoin = resolve))
        : Promise.resolve({ ok: true }),
    ) as typeof socket.value.request;
    render(
      <ChatProviders client={client} socket={socket.value}>
        <ChatThread
          side="company"
          source={{ conversationId: 'c-1', fetch: fetchFn, send: vi.fn() }}
          counterpartName="OrixTech"
          ctx={{ platformName: 'OrixTech', ticketHref: (id) => `/t/${id}` }}
          canWrite
          empty={null}
        />
      </ChatProviders>,
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith({ limit: 50 }));
    // seq 3 se publica acá: la sala todavía no está unida, no llega por el socket.
    await act(() => Promise.resolve(ackJoin({ ok: true })));
    await act(() => Promise.resolve(answerFirst(page([msg(1), msg(2)]))));
    expect(await screen.findByText('mensaje 3')).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledWith({ afterSeq: 2, limit: 100 });
  });
});

describe('ChatThread: el búfer no se mezcla entre aperturas (corrección 2)', () => {
  it('si la primera carga falla, lo del búfer no aparece al reintentar', async () => {
    let fail = true;
    const { socket } = setup({
      fetch: (q) =>
        fail ? Promise.reject(new Error('caído')) : Promise.resolve(q.afterSeq ? page([]) : page([msg(1), msg(2)])),
    });
    await waitFor(() => expect(socket.value.request).toHaveBeenCalledWith('chat:join', { conversationId: 'c-1' }));
    act(() => socket.fire('chat:message', { conversationId: 'c-1', seq: 3, message: msg(3, { body: 'viejo' }) }));
    const retry = await screen.findByRole('button', { name: /Reintentar/ }, { timeout: 4000 });
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText('mensaje 2')).toBeInTheDocument();
    expect(screen.queryByText('viejo')).not.toBeInTheDocument();
  });

  it('al salir de la sala se olvida el búfer: al volver a abrir no aparece el mensaje viejo', async () => {
    const pending = new Promise<MessageList>(() => undefined);
    const first = setup({ fetch: () => pending });
    await waitFor(() =>
      expect(first.socket.value.request).toHaveBeenCalledWith('chat:join', { conversationId: 'c-1' }),
    );
    act(() => first.socket.fire('chat:message', { conversationId: 'c-1', seq: 3, message: msg(3, { body: 'viejo' }) }));
    first.unmount();
    // La caché del hilo se recicla (como al pasar el tiempo de gc), el búfer no debería sobrevivir.
    first.client.removeQueries();
    render(
      <ChatProviders client={first.client} socket={first.socket.value}>
        <ChatThread
          side="company"
          source={{
            conversationId: 'c-1',
            fetch: (q) => Promise.resolve(q.afterSeq ? page([]) : page([msg(1), msg(2)])),
            send: vi.fn(),
          }}
          counterpartName="OrixTech"
          ctx={{ platformName: 'OrixTech', ticketHref: (id) => `/t/${id}` }}
          canWrite
          empty={null}
        />
      </ChatProviders>,
    );
    expect(await screen.findByText('mensaje 2')).toBeInTheDocument();
    expect(screen.queryByText('viejo')).not.toBeInTheDocument();
  });
});

describe('ChatThread: historial y leído (P4, P5)', () => {
  it('«Ver mensajes anteriores» pide antes del primero (beforeSeq) y los suma arriba', async () => {
    const fetchFn = vi.fn((q: MessagesQuery) =>
      Promise.resolve(q.beforeSeq ? page([msg(8), msg(9)], false) : page([msg(10), msg(11)], true)),
    );
    setup({ fetch: fetchFn });
    fireEvent.click(await screen.findByRole('button', { name: 'Ver mensajes anteriores' }));
    expect(await screen.findByText('mensaje 8')).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledWith({ beforeSeq: 10, limit: 50 });
    expect(screen.queryByRole('button', { name: 'Ver mensajes anteriores' })).not.toBeInTheDocument();
  });

  it('marca leído hasta el último, 2 s después, con el hilo a la vista', async () => {
    const read = vi.fn(() => Promise.resolve());
    setup({ read });
    await screen.findByText('mensaje 2');
    expect(read).not.toHaveBeenCalled();
    await waitFor(() => expect(read).toHaveBeenCalledWith(2), { timeout: 3000 });
  });
});

describe('ChatThread: compositor (P8, P9)', () => {
  it('Shift+Enter no envía; vacío no envía; cuenta hasta 2000', async () => {
    const { sendFn } = setup();
    await screen.findByText('mensaje 2');
    enter();
    type('línea');
    enter(true);
    expect(sendFn).not.toHaveBeenCalled();
    expect(screen.getByText('5/2000')).toBeInTheDocument();
    type('x'.repeat(2001));
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('lo escrito sin enviar queda guardado por conversación (corte, cambio de pantalla)', async () => {
    const { unmount } = setup();
    await screen.findByText('mensaje 2');
    type('a medio escribir');
    unmount();
    setup();
    await screen.findByText('mensaje 2');
    expect(composer()).toHaveValue('a medio escribir');
  });

  it('sin permiso para escribir, el aviso en lugar del compositor', async () => {
    setup({ props: { canWrite: false, readOnlyNotice: <p>Sólo lectura</p> } });
    await screen.findByText('mensaje 2');
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument();
    expect(screen.getByText('Sólo lectura')).toBeInTheDocument();
  });
});
