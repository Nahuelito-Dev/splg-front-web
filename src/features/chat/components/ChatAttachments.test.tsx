import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, msg, newQueryClient } from '../../../test/chatFixtures';
import type { ChatAttachmentInput, OnUploadProgress } from '../../../services/api/chatAttachments';
import type { ChatAttachment, DownloadLink, MessageDto } from '../../../services/api/types';
import type { ThreadAttachments, ThreadSource } from '../../../services/queries/chatThread';
import { saveFileSource } from '../../../utils/fileSource';
import type { ChatAttachmentChannel } from '../attachments';
import { useSupportChatBridge } from '../useSupportChatBridge';
import { typingStore } from '../typing';
import { ChatAttachmentItem } from './ChatAttachmentItem';
import { ChatThread, type ChatThreadProps } from './ChatThread';

vi.mock('../../../utils/fileSource', () => ({ saveFileSource: vi.fn(), openFileSource: vi.fn() }));

const alerts = vi.hoisted(() => ({ alertIncoming: vi.fn() }));
vi.mock('../alerts', async (original) => ({ ...(await original<Record<string, unknown>>()), ...alerts }));

beforeEach(() => {
  // jsdom no arma URLs de blobs: la vista previa local de la foto elegida.
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
  URL.revokeObjectURL = vi.fn();
  vi.mocked(saveFileSource).mockClear();
  alerts.alertIncoming.mockClear();
});

afterEach(() => {
  cleanup();
  typingStore.reset();
  sessionStorage.clear();
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const attachment = (over: Partial<ChatAttachment> = {}): ChatAttachment => ({
  id: 'a-1',
  fileName: 'remito.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 245_000,
  scanStatus: 'clean',
  width: null,
  height: null,
  ...over,
});

const withAttachment = (seq: number, att: Partial<ChatAttachment> = {}, over: Partial<MessageDto> = {}) =>
  msg(seq, { kind: 'attachment', body: null, attachment: attachment(att), ...over });

const link = (url = 'https://s3.example/firmada?x=1'): DownloadLink => ({
  url,
  expiresAt: '2026-11-16T15:05:00.000Z',
  requiresAuth: false,
});

const axiosError = (status: number, message: string, code?: string) => {
  const error = new AxiosError('fallo');
  error.response = {
    status,
    data: { statusCode: status, message, code },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
};

const Bridge = () => {
  useSupportChatBridge('company', 'Mensaje');
  return null;
};

interface Setup {
  messages?: MessageDto[];
  upload?: ThreadAttachments['upload'] | null;
  linkFn?: ThreadAttachments['link'];
  channel?: ChatAttachmentChannel;
  props?: Partial<ChatThreadProps>;
  /** Sin adjuntos en la fuente: el hilo no sabe pedir enlaces. */
  noAttachments?: boolean;
  fetch?: ThreadSource['fetch'];
  edit?: ThreadSource['edit'];
  hasMore?: boolean;
}

const setup = ({
  messages = [msg(1)],
  upload,
  linkFn,
  channel = 'support',
  props,
  noAttachments,
  fetch,
  edit,
  hasMore = false,
}: Setup = {}) => {
  const client = newQueryClient();
  const socket = fakeSocket();
  const uploadFn = vi.fn(
    upload ??
      ((input: ChatAttachmentInput) =>
        Promise.resolve(
          withAttachment(
            messages.length + 1,
            { fileName: input.file.name, mimeType: input.file.type, sizeBytes: input.file.size },
            { isMine: true, clientMessageId: input.clientMessageId, body: input.caption ?? null },
          ),
        )),
  );
  const linkMock = vi.fn(linkFn ?? (() => Promise.resolve(link())));
  render(
    <ChatProviders client={client} socket={socket.value}>
      <Bridge />
      <ChatThread
        side="company"
        source={{
          conversationId: 'c-1',
          fetch: fetch ?? (() => Promise.resolve({ items: messages, hasMore })),
          send: () => Promise.reject(new Error('no se usa')),
          edit,
          attachments: noAttachments
            ? undefined
            : { channel, link: linkMock, ...(upload === null ? {} : { upload: uploadFn }) },
        }}
        counterpartName="OrixTech"
        ctx={{ platformName: 'OrixTech', ticketHref: (id) => `/support/tickets/${id}` }}
        canWrite
        empty={<p>Sin mensajes</p>}
        {...props}
      />
    </ChatProviders>,
  );
  return { client, socket, uploadFn, linkMock };
};

const file = (name: string, type: string, size = 1024) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

const choose = async (chosen: File) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar un archivo' }));
  fireEvent.change(screen.getByTestId('chat-attachment-input'), { target: { files: [chosen] } });
  return screen.findByRole('dialog', { name: 'Mandar un archivo' });
};

describe('Adjuntos: mandar', () => {
  it('sube el archivo con su epígrafe y un clientMessageId, muestra el avance y lo deja en el hilo', async () => {
    let finish: (m: MessageDto) => void = () => undefined;
    let progress: OnUploadProgress | undefined;
    const { uploadFn } = setup({
      upload: (_input, onProgress) => {
        progress = onProgress;
        return new Promise((resolve) => (finish = resolve));
      },
    });
    const dialog = await choose(file('remito.pdf', 'application/pdf', 245_000));
    expect(within(dialog).getByText('remito.pdf')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Epígrafe (opcional)'), { target: { value: '  El de octubre  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(uploadFn).toHaveBeenCalledTimes(1));
    const [input] = uploadFn.mock.calls[0];
    expect(input.file.name).toBe('remito.pdf');
    expect(input.caption).toBe('El de octubre');
    expect(input.clientMessageId).toMatch(UUID);

    act(() => progress?.(40));
    expect(screen.getByRole('progressbar', { name: 'Subiendo el archivo' })).toHaveAttribute('aria-valuenow', '40');
    act(() =>
      finish(withAttachment(2, {}, { isMine: true, clientMessageId: input.clientMessageId, body: 'El de octubre' })),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Descargar remito.pdf' })).toBeInTheDocument();
    expect(screen.getByText('El de octubre')).toBeInTheDocument();
  });

  it.each([
    [413, 'El archivo supera el máximo permitido (10 MB)', 'ATTACHMENT_TOO_LARGE'],
    [415, 'En este chat se pueden mandar PDF, fotos, Word, Excel y CSV.', 'ATTACHMENT_TYPE_NOT_ALLOWED'],
    [429, 'Ya mandaste 30 archivos hoy. Vas a poder mandar más mañana.', 'ATTACHMENT_DAILY_LIMIT'],
  ])('un %i muestra el texto de la API y no cierra', async (status, message, code) => {
    setup({ upload: () => Promise.reject(axiosError(status, message, code)) });
    const dialog = await choose(file('remito.pdf', 'application/pdf'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('dialog', { name: 'Mandar un archivo' })).toBeInTheDocument();
  });

  it('reintentar un corte usa el MISMO clientMessageId; otro archivo, uno nuevo', async () => {
    let fail = true;
    const { uploadFn } = setup({
      upload: (input) =>
        fail
          ? Promise.reject(new AxiosError('Network Error'))
          : Promise.resolve(withAttachment(2, {}, { clientMessageId: input.clientMessageId, isMine: true })),
    });
    const dialog = await choose(file('remito.pdf', 'application/pdf'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor');
    fail = false;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(uploadFn).toHaveBeenCalledTimes(2));
    expect(uploadFn.mock.calls[1][0].clientMessageId).toBe(uploadFn.mock.calls[0][0].clientMessageId);

    // Otro envío, otro id.
    const again = await choose(file('factura.pdf', 'application/pdf'));
    fireEvent.click(within(again).getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(uploadFn).toHaveBeenCalledTimes(3));
    expect(uploadFn.mock.calls[2][0].clientMessageId).not.toBe(uploadFn.mock.calls[0][0].clientMessageId);
  });

  it('en la bandeja, el selector acepta fotos y PDF y frena antes de subir un Excel o una foto de más de 5 MB', async () => {
    const { uploadFn } = setup({ channel: 'inbox' });
    const excel = await choose(file('lista.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(screen.getByTestId('chat-attachment-input')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp,application/pdf',
    );
    expect(
      await within(excel).findByText('En este chat se pueden mandar fotos (JPG, PNG o WEBP) y PDF.'),
    ).toBeVisible();
    fireEvent.click(within(excel).getByRole('button', { name: 'Enviar' }));

    fireEvent.change(screen.getByTestId('chat-attachment-input'), {
      target: { files: [file('garrafa.jpg', 'image/jpeg', 6 * 1024 * 1024)] },
    });
    expect(await within(excel).findByText('La foto supera el máximo permitido (5 MB).')).toBeVisible();
    fireEvent.click(within(excel).getByRole('button', { name: 'Enviar' }));
    // Un PDF de 6 MB sí entra (el tope del PDF es 10 MB).
    fireEvent.change(screen.getByTestId('chat-attachment-input'), {
      target: { files: [file('remito.pdf', 'application/pdf', 6 * 1024 * 1024)] },
    });
    await waitFor(() => expect(within(excel).queryByText(/supera el máximo/)).not.toBeInTheDocument());
    expect(uploadFn).not.toHaveBeenCalled();
  });

  it('el soporte acepta Word, Excel y CSV aunque el navegador no informe el tipo', async () => {
    const { uploadFn } = setup({ channel: 'support' });
    const dialog = await choose(file('datos.csv', ''));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(uploadFn).toHaveBeenCalledTimes(1));
  });

  it('el clip no aparece en una nota interna, ni si el hilo no sube adjuntos', async () => {
    setup({ props: { allowInternal: true } });
    expect(await screen.findByRole('button', { name: 'Adjuntar un archivo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Nota interna/ }));
    expect(screen.queryByRole('button', { name: 'Adjuntar un archivo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.getByRole('button', { name: 'Adjuntar un archivo' })).toBeInTheDocument();
    cleanup();

    setup({ upload: null });
    expect(await screen.findByText('mensaje 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjuntar un archivo' })).not.toBeInTheDocument();
  });
});

describe('Adjuntos: en el hilo', () => {
  it('un archivo limpio se descarga con un enlace pedido en el momento', async () => {
    const { linkMock } = setup({ messages: [withAttachment(1)] });
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar remito.pdf' }));
    await waitFor(() => expect(saveFileSource).toHaveBeenCalledTimes(1));
    expect(linkMock).toHaveBeenCalledWith('m-1');
    expect(vi.mocked(saveFileSource).mock.calls[0]).toEqual([
      { kind: 'url', url: 'https://s3.example/firmada?x=1', expiresAt: '2026-11-16T15:05:00.000Z' },
      'remito.pdf',
    ]);
    expect(screen.getByText('239 KB')).toBeInTheDocument();
  });

  it('pendiente: «Verificando el archivo…» sin descarga; no verificado: el aviso, sin descarga', async () => {
    const { linkMock } = setup({
      messages: [withAttachment(1, { scanStatus: 'pending' }), withAttachment(2, { scanStatus: 'failed', id: 'a-2' })],
    });
    expect(await screen.findByText('Verificando el archivo…')).toBeInTheDocument();
    expect(screen.getByText('No se pudo verificar el archivo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar/ })).not.toBeInTheDocument();
    expect(linkMock).not.toHaveBeenCalled();
  });

  it('bloqueado: no se muestra nada del archivo', async () => {
    const { linkMock } = setup({ messages: [withAttachment(1, { scanStatus: 'infected', fileName: 'virus.pdf' })] });
    expect(await screen.findByText('Archivo bloqueado por seguridad')).toBeInTheDocument();
    expect(screen.queryByText('virus.pdf')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar/ })).not.toBeInTheDocument();
    expect(linkMock).not.toHaveBeenCalled();
  });

  it('el 409/404 del enlace se muestra con el texto de la API', async () => {
    setup({
      messages: [withAttachment(1)],
      linkFn: () => Promise.reject(axiosError(409, 'Estamos verificando el archivo.', 'ATTACHMENT_SCAN_PENDING')),
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar remito.pdf' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Estamos verificando el archivo.');
    expect(saveFileSource).not.toHaveBeenCalled();
  });

  it('cuando termina el escaneo, el mismo mensaje se actualiza por el socket sin volver a avisar', async () => {
    const { socket } = setup({ messages: [withAttachment(1, { scanStatus: 'pending' })] });
    expect(await screen.findByText('Verificando el archivo…')).toBeInTheDocument();
    act(() =>
      socket.fire('chat:message', {
        conversationId: 'c-1',
        distributorId: 'd-1',
        seq: 1,
        message: withAttachment(1, { scanStatus: 'clean' }),
      }),
    );
    expect(await screen.findByRole('button', { name: 'Descargar remito.pdf' })).toBeInTheDocument();
    expect(screen.queryByText('Verificando el archivo…')).not.toBeInTheDocument();
    expect(alerts.alertIncoming).not.toHaveBeenCalled();
  });

  it('una foto: miniatura con el epígrafe como alt; si el enlace venció se pide otro, y el visor pide uno nuevo', async () => {
    let n = 0;
    const { linkMock } = setup({
      messages: [
        withAttachment(
          1,
          { fileName: 'garrafa.jpg', mimeType: 'image/jpeg', width: 1200, height: 900 },
          { body: 'La garrafa abollada' },
        ),
      ],
      linkFn: () => Promise.resolve(link(`https://s3.example/foto?v=${++n}`)),
    });
    const img = await screen.findByRole('img', { name: 'La garrafa abollada' });
    expect(img).toHaveAttribute('src', 'https://s3.example/foto?v=1');
    expect(img).toHaveAttribute('width', '240');
    expect(img).toHaveAttribute('height', '180');

    // La firma venció: la imagen falla y se pide un enlace nuevo.
    fireEvent.error(img);
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'La garrafa abollada' })).toHaveAttribute(
        'src',
        'https://s3.example/foto?v=2',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver la foto garrafa.jpg en grande' }));
    const viewer = await screen.findByRole('dialog', { name: 'garrafa.jpg' });
    expect(await within(viewer).findByRole('img', { name: 'La garrafa abollada' })).toHaveAttribute(
      'src',
      'https://s3.example/foto?v=3',
    );
    expect(linkMock).toHaveBeenCalledTimes(3);
    fireEvent.keyDown(viewer, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

const reemit = (message: MessageDto) => ({ conversationId: 'c-1', distributorId: 'd-1', seq: message.seq, message });

describe('Adjuntos: correcciones de la ronda 1', () => {
  it('una re-emisión de un mensaje anterior a lo cargado no se agrega ni avisa', async () => {
    const { socket } = setup({ messages: [msg(5), msg(6)], hasMore: true });
    expect(await screen.findByText('mensaje 5')).toBeInTheDocument();
    act(() => socket.fire('chat:message', reemit(withAttachment(2, { fileName: 'viejo.pdf' }))));
    expect(screen.queryByText('viejo.pdf')).not.toBeInTheDocument();
    expect(alerts.alertIncoming).not.toHaveBeenCalled();
  });

  it('la re-emisión con el hilo todavía cargando avisa una sola vez', async () => {
    let resolve: (page: { items: MessageDto[]; hasMore: boolean }) => void = () => undefined;
    const { socket } = setup({ fetch: () => new Promise((r) => (resolve = r)) });
    const pending = withAttachment(1, { scanStatus: 'pending' });
    act(() => socket.fire('chat:message', reemit(pending)));
    act(() => socket.fire('chat:message', reemit(withAttachment(1, { scanStatus: 'clean' }))));
    expect(alerts.alertIncoming).toHaveBeenCalledTimes(1);
    act(() => resolve({ items: [pending], hasMore: false }));
    expect(await screen.findByText('remito.pdf')).toBeInTheDocument();
  });

  it('pending → infected por el socket oculta el nombre y la descarga', async () => {
    const { socket } = setup({ messages: [withAttachment(1, { scanStatus: 'pending' })] });
    expect(await screen.findByText('remito.pdf')).toBeInTheDocument();
    act(() => socket.fire('chat:message', reemit(withAttachment(1, { scanStatus: 'infected' }))));
    expect(await screen.findByText('Archivo bloqueado por seguridad')).toBeInTheDocument();
    expect(screen.queryByText('remito.pdf')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar/ })).not.toBeInTheDocument();
  });

  it('si la re-emisión (limpio) llega antes que la respuesta de la subida (pendiente), queda limpio', async () => {
    let finish: (m: MessageDto) => void = () => undefined;
    const { socket } = setup({ upload: () => new Promise((resolve) => (finish = resolve)) });
    const dialog = await choose(file('remito.pdf', 'application/pdf'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    act(() => socket.fire('chat:message', reemit(withAttachment(2, { scanStatus: 'clean' }, { isMine: true }))));
    // Con el diálogo abierto el resto de la página queda oculto para la accesibilidad (`hidden`).
    expect(await screen.findByRole('button', { name: 'Descargar remito.pdf', hidden: true })).toBeInTheDocument();
    act(() => finish(withAttachment(2, { scanStatus: 'pending' }, { isMine: true })));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Descargar remito.pdf' })).toBeInTheDocument();
    expect(screen.queryByText('Verificando el archivo…')).not.toBeInTheDocument();
  });

  it('un estado del escaneo que el panel no conoce no ofrece el archivo', async () => {
    setup({ messages: [withAttachment(1, { scanStatus: 'otro' as ChatAttachment['scanStatus'] })] });
    expect(await screen.findByText('No se pudo verificar el archivo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar/ })).not.toBeInTheDocument();
  });

  it('sin enlace en el hilo: un bloqueado no muestra el nombre y uno limpio no ofrece descargar', async () => {
    setup({
      noAttachments: true,
      messages: [
        withAttachment(1, { scanStatus: 'infected', fileName: 'virus.pdf' }),
        withAttachment(2, { fileName: 'limpio.pdf', id: 'a-2' }),
      ],
    });
    expect(await screen.findByText('Archivo bloqueado por seguridad')).toBeInTheDocument();
    expect(screen.queryByText('virus.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('limpio.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar/ })).not.toBeInTheDocument();
  });

  it('el clip no aparece mientras se edita un mensaje', async () => {
    setup({
      messages: [msg(1, { isMine: true, canEdit: true, createdAt: new Date().toISOString() } as Partial<MessageDto>)],
      edit: (_id, body) => Promise.resolve(msg(1, { body, isMine: true })),
    });
    expect(await screen.findByRole('button', { name: 'Adjuntar un archivo' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Editar tu mensaje/ }));
    expect(screen.queryByRole('button', { name: 'Adjuntar un archivo' })).not.toBeInTheDocument();
  });

  it('con un reintento pendiente el epígrafe queda fijo; otro archivo lo libera', async () => {
    setup({ upload: () => Promise.reject(new AxiosError('Network Error')) });
    const dialog = await choose(file('remito.pdf', 'application/pdf'));
    fireEvent.change(within(dialog).getByLabelText('Epígrafe (opcional)'), { target: { value: 'Octubre' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Epígrafe (opcional)')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByTestId('chat-attachment-input'), {
      target: { files: [file('factura.pdf', 'application/pdf')] },
    });
    expect(within(dialog).getByLabelText('Epígrafe (opcional)')).not.toHaveAttribute('readonly');
  });

  it('«Descargar» del visor pide un enlace nuevo (el de la vista pudo vencer)', async () => {
    let n = 0;
    const { linkMock } = setup({
      messages: [withAttachment(1, { fileName: 'garrafa.jpg', mimeType: 'image/jpeg', width: 800, height: 600 })],
      linkFn: () => Promise.resolve(link(`https://s3.example/foto?v=${++n}`)),
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Ver la foto garrafa.jpg en grande' }));
    const viewer = await screen.findByRole('dialog', { name: 'garrafa.jpg' });
    await within(viewer).findByRole('img', { name: 'garrafa.jpg' });
    expect(linkMock).toHaveBeenCalledTimes(2);
    fireEvent.click(within(viewer).getByRole('button', { name: 'Descargar' }));
    await waitFor(() => expect(saveFileSource).toHaveBeenCalledTimes(1));
    expect(linkMock).toHaveBeenCalledTimes(3);
    expect(vi.mocked(saveFileSource).mock.calls[0][0]).toMatchObject({ url: 'https://s3.example/foto?v=3' });
  });

  it('el título del visor con un nombre largo se corta en vez de desbordar', async () => {
    const name = `${'garrafa-'.repeat(12)}.jpg`;
    setup({ messages: [withAttachment(1, { fileName: name, mimeType: 'image/jpeg', width: 800, height: 600 })] });
    fireEvent.click(await screen.findByRole('button', { name: `Ver la foto ${name} en grande` }));
    const title = await screen.findByRole('heading', { name });
    expect(title).toHaveClass('break-words');
    expect(title.parentElement).toHaveClass('min-w-0');
  });

  it.each([
    ['muy angosta', 100, 4000, '120', '280'],
    ['muy apaisada', 4000, 100, '240', '64'],
  ])('una foto %s tiene ancho y alto mínimos', async (_, width, height, w, h) => {
    setup({ messages: [withAttachment(1, { fileName: 'f.jpg', mimeType: 'image/jpeg', width, height })] });
    const img = await screen.findByRole('img', { name: 'f.jpg' });
    expect(img).toHaveAttribute('width', w);
    expect(img).toHaveAttribute('height', h);
    expect(img).toHaveClass('object-cover');
  });

  it('si la miniatura falla dos veces queda el error con «Reintentar», sin más pedidos solos', async () => {
    let n = 0;
    const { linkMock } = setup({
      messages: [withAttachment(1, { fileName: 'f.jpg', mimeType: 'image/jpeg', width: 800, height: 600 })],
      linkFn: () => Promise.resolve(link(`https://s3.example/foto?v=${++n}`)),
    });
    fireEvent.error(await screen.findByRole('img', { name: 'f.jpg' }));
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'f.jpg' })).toHaveAttribute('src', 'https://s3.example/foto?v=2'),
    );
    fireEvent.error(screen.getByRole('img', { name: 'f.jpg' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo mostrar la foto.');
    expect(linkMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    // Mientras llega el enlace nuevo no se vuelve a mostrar el que falló.
    expect(screen.queryByRole('img', { name: 'f.jpg' })).not.toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'f.jpg' })).toHaveAttribute('src', 'https://s3.example/foto?v=3');
  });

  it('la URL no queda guardada: al volver a mostrar la miniatura se espera un enlace nuevo', async () => {
    const client = newQueryClient();
    let n = 0;
    let hold = false;
    const linkFn = vi.fn(() =>
      hold ? new Promise<DownloadLink>(() => undefined) : Promise.resolve(link(`https://s3.example/foto?v=${++n}`)),
    );
    const photo = attachment({ fileName: 'f.jpg', mimeType: 'image/jpeg', width: 800, height: 600 });
    const item = (
      <QueryClientProvider client={client}>
        <ChatAttachmentItem messageId="m-1" attachment={photo} caption={null} link={linkFn} />
      </QueryClientProvider>
    );
    const first = render(item);
    expect(await screen.findByRole('img', { name: 'f.jpg' })).toHaveAttribute('src', 'https://s3.example/foto?v=1');
    first.unmount();
    // El caché suelta la consulta en el próximo turno (`gcTime: 0`).
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    hold = true;
    render(item);
    expect(screen.getByRole('status', { name: 'Cargando la foto' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'f.jpg' })).not.toBeInTheDocument();
    expect(linkFn).toHaveBeenCalledTimes(2);
  });
});
