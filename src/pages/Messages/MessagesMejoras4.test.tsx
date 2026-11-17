import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';
import { inboxConversation, inboxMsg } from '../../test/inboxFixtures';
import type { InboxAccess } from '../../features/chat/useInboxAccess';
import { ApiError } from '../../services/api/errors';
import type { InboxConversation, InboxCsat } from '../../services/api/types';
import { readNoteDraft } from '../../features/chat/composerDraft';

const access = vi.hoisted(() => ({
  value: { customers: true, drivers: true, configure: true, claims: true, any: true } as InboxAccess,
}));
const api = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  listConversationMessages: vi.fn(),
  sendConversationMessage: vi.fn(),
  sendConversationNote: vi.fn(),
  markMentionsRead: vi.fn(() => Promise.resolve({ updated: 1 })),
  editConversationMessage: vi.fn(),
  assignConversation: vi.fn(),
  closeConversation: vi.fn(),
  reopenConversation: vi.fn(),
  readConversation: vi.fn(() => Promise.resolve()),
  createClaimFromConversation: vi.fn(),
  getChatSettings: vi.fn(),
  listCompanyTemplates: vi.fn(() => Promise.resolve({ items: [] })),
  getConversationSuggestions: vi.fn(() => Promise.resolve({ basedOnSeq: 0, items: [] })),
  getInboxSummary: vi.fn(),
  listConversationAssignees: vi.fn(),
}));

vi.mock('../../features/chat/useInboxAccess', () => ({ useInboxAccess: () => access.value }));
vi.mock('../../services/api/chatAssignment', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getMyChatStatus: () =>
    Promise.resolve({
      status: 'away',
      connected: true,
      available: false,
      maxOpen: 5,
      maxOpenOverride: null,
      openAssigned: 0,
      channels: ['staff_customer', 'staff_driver'],
    }),
}));
vi.mock('../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../services/queries/users', () => ({ useMyAccount: () => ({ data: { user_id: 'u-me' } }) }));
vi.mock('../../common/components/useCompanyDisplayName', () => ({ useCompanyDisplayName: () => 'Gas Norte' }));
vi.mock('../../hooks/reduxHooks', () => ({ useAppSelector: () => 'admin@splg.com' }));
vi.mock('../../services/queries/claims', () => ({ useClaim: () => ({ data: undefined, isPending: true }) }));
vi.mock('../../services/queries/customers', () => ({
  useCustomerOrders: () => ({ data: { orders: [] }, isPending: false }),
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  confirm: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('../../features/chat/inbox/BroadcastDriversModal', () => ({ BroadcastDriversModal: () => null }));

import { inboxKeys } from '../../services/queries/inbox';
import { Messages } from './Messages';

const SETTINGS = {
  customerChatEnabled: true,
  assistantName: null,
  effectiveAssistantName: 'Asistente de Gas Norte',
  handoffMessage: null,
  effectiveHandoffMessage: 'Te paso',
  outOfHoursEnabled: true,
  outOfHoursMessage: null,
  effectiveOutOfHoursMessage: 'Fuera',
  ackEnabled: false,
  ackMessage: null,
  effectiveAckMessage: 'Recibimos',
  csatEnabled: true,
  csatMessage: null,
  effectiveCsatMessage: '¿Cómo te atendimos?',
  customerActions: ['where_is_my_order', 'talk_to_person'],
  firstResponseTargetMinutes: 30,
  openNow: true,
  nextOpenAt: null,
};

const CSAT: InboxCsat = {
  ratingId: 'r-1',
  status: 'answered',
  score: 4,
  comment: 'Muy rápido',
  servedBy: 'assistant',
  requestedAt: '2026-11-15T14:00:00.000Z',
  expiresAt: '2026-11-17T14:00:00.000Z',
  answeredAt: '2026-11-15T14:05:00.000Z',
};

const list = (items: InboxConversation[]) => ({
  items,
  total: items.length,
  counts: { unassigned: 1, mine: 0, open: 1 },
});

beforeEach(() => {
  access.value = { customers: true, drivers: true, configure: true, claims: true, any: true };
  Object.values(api).forEach((fn) => fn.mockClear());
  api.listConversations.mockResolvedValue(list([inboxConversation()]));
  api.getConversation.mockResolvedValue(inboxConversation());
  api.listConversationMessages.mockResolvedValue({ items: [inboxMsg(1)], hasMore: false });
  api.getChatSettings.mockResolvedValue(SETTINGS);
  api.getInboxSummary.mockResolvedValue({
    unassigned: 1,
    mine: 0,
    awaitingHuman: 0,
    unread: 1,
    attention: 1,
    mentions: 3,
  });
  api.listConversationAssignees.mockResolvedValue({
    items: [
      { userId: 'u-me', fullName: 'Ana Operadora' },
      { userId: 'u-2', fullName: 'Beto Despacho' },
    ],
  });
  api.sendConversationNote.mockImplementation(
    (conversationId: string, body: { clientMessageId: string; body: string }) =>
      Promise.resolve(
        inboxMsg(2, {
          conversationId,
          clientMessageId: body.clientMessageId,
          party: 'company',
          isMine: true,
          internal: true,
          body: body.body,
          sender: { displayName: 'Ana Operadora' },
          mentions: [{ userId: 'u-2', fullName: 'Beto Despacho' }],
        }),
      ),
  );
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const show = (url = '/messages/conv-1') => {
  const socket = fakeSocket();
  render(
    <ChatProviders client={newQueryClient()} socket={socket.value} url={url}>
      <Routes>
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
      </Routes>
    </ChatProviders>,
  );
  return socket;
};

describe('Mensajes: notas internas (4a)', () => {
  it('la nota va por su endpoint (nunca por el de mensajes) con la mención, y el «escribiendo…» lleva `internal`', async () => {
    const socket = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota interna' }));
    // El equipo se pide recién al pasar a nota.
    await waitFor(() => expect(api.listConversationAssignees).toHaveBeenCalledWith('conv-1'));
    const box = screen.getByRole('combobox', { name: 'Nota interna' });
    fireEvent.change(box, { target: { value: '@', selectionStart: 1, selectionEnd: 1 } });
    const options = await screen.findAllByRole('option');
    // Mencionarse a uno mismo no avisa a nadie: no se ofrece.
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAccessibleName('Beto Despacho');
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.change(box, { target: { value: '@Beto Despacho mirá esto', selectionStart: 24, selectionEnd: 24 } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() =>
      expect(api.sendConversationNote).toHaveBeenCalledWith('conv-1', {
        clientMessageId: expect.any(String) as string,
        body: '@Beto Despacho mirá esto',
        mentions: ['u-2'],
      }),
    );
    expect(api.sendConversationMessage).not.toHaveBeenCalled();
    const typing = (socket.value.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([event]) => event === 'chat:typing',
    );
    expect(typing.length).toBeGreaterThan(0);
    // El cliente nunca se entera: toda señal de escritura de la nota lleva la marca.
    for (const [, payload] of typing) expect(payload).toEqual({ conversationId: 'conv-1', internal: true });
    // La nota queda en el hilo con su estilo y la mención resaltada.
    const note = await screen.findByRole('region', { name: 'Nota interna de Ana Operadora' });
    expect(within(note).getByText('Sólo lo ve el equipo')).toBeInTheDocument();
    expect(within(note).getByText('@Beto Despacho').tagName).toBe('MARK');
  });

  it('el mensaje al cliente sigue por su endpoint y su «escribiendo…» va sin marca', async () => {
    api.sendConversationMessage.mockResolvedValue(inboxMsg(2, { party: 'company', isMine: true, body: 'Hola' }));
    const socket = show();
    const box = await screen.findByRole('textbox', { name: 'Mensaje' });
    fireEvent.change(box, { target: { value: 'Hola' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(api.sendConversationMessage).toHaveBeenCalled());
    expect(api.sendConversationNote).not.toHaveBeenCalled();
    expect(socket.value.emit).toHaveBeenCalledWith('chat:typing', { conversationId: 'conv-1' });
  });

  it('al abrir una conversación con menciones sin leer, se marcan leídas una vez', async () => {
    api.getConversation.mockResolvedValue(inboxConversation({ unreadMentions: 2 }));
    show();
    await waitFor(() => expect(api.markMentionsRead).toHaveBeenCalledWith('conv-1'));
    await screen.findByRole('textbox', { name: 'Mensaje' });
    expect(api.markMentionsRead).toHaveBeenCalledTimes(1);
  });

  it('sin menciones sin leer no se marca nada', async () => {
    show();
    await screen.findByRole('textbox', { name: 'Mensaje' });
    expect(api.markMentionsRead).not.toHaveBeenCalled();
  });

  it('«Me mencionaron» pide `mentioned=me` y cuenta las menciones sin leer del resumen', async () => {
    api.listConversations.mockResolvedValue(list([inboxConversation({ unreadMentions: 2 })]));
    show('/messages');
    const tab = await screen.findByRole('tab', { name: /Me mencionaron.*3/ });
    fireEvent.click(tab);
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith({ mentioned: 'me', limit: 50, offset: 0 }),
    );
    const row = await screen.findByRole('link', { name: /Lucía Benítez/ });
    expect(row).toHaveTextContent('2 menciones sin leer');
  });
});

describe('Mensajes: lo que se ve en el hilo (4b–4e)', () => {
  it('la nota del asistente al derivar, la encuesta con su resultado, las fuentes y el botón del cliente', async () => {
    api.getConversation.mockResolvedValue(inboxConversation({ status: 'closed', canWrite: false, csat: CSAT }));
    api.listConversationMessages.mockResolvedValue({
      items: [
        inboxMsg(1, { body: '¿Dónde está mi pedido?', payload: { action: 'where_is_my_order' } }),
        inboxMsg(2, {
          party: 'system',
          sender: null,
          kind: 'text',
          automated: true,
          senderLabel: 'Asistente de Gas Norte',
          body: 'Tu pedido A1B2C3 está en camino.',
          payload: {
            ai: {
              model: 'm',
              sources: [
                { type: 'tool', tool: 'estado_de_mi_pedido', orderNumber: 'A1B2C3' },
                { type: 'faq', faqId: 'f-1', question: '¿Cuánto tarda el envío?' },
              ],
            },
          },
        }),
        inboxMsg(3, {
          party: 'system',
          sender: null,
          kind: 'system',
          internal: true,
          systemCode: 'handoff_note',
          body: 'Resumen: …',
          payload: {
            ai: { model: 'm', handoff: true },
            handoff: {
              reason: 'requested',
              reasonLabel: 'La persona pidió hablar con alguien',
              summary: 'Pide factura A.',
            },
          },
        }),
        inboxMsg(4, {
          party: 'system',
          sender: null,
          kind: 'system',
          systemCode: 'csat_request',
          body: '¿Cómo te atendimos en Gas Norte?',
          payload: { ratingId: 'r-1', expiresAt: CSAT.expiresAt, scale: 5 },
        }),
      ],
      hasMore: false,
    });
    show();
    expect(await screen.findByText(/Botón: ¿Dónde está mi pedido\?/)).toBeInTheDocument();
    expect(
      screen.getByText(/Estado del pedido #A1B2C3 · Pregunta frecuente «¿Cuánto tarda el envío\?»/),
    ).toBeInTheDocument();
    const handoff = screen.getByRole('region', { name: 'Nota del asistente al pasar la conversación a una persona' });
    expect(within(handoff).getByText('Pide factura A.')).toBeInTheDocument();
    expect(within(handoff).getByText('La persona pidió hablar con alguien')).toBeInTheDocument();
    const survey = screen.getByRole('region', { name: 'Encuesta de satisfacción' });
    expect(within(survey).getByRole('img', { name: '4 de 5' })).toBeInTheDocument();
    expect(within(survey).getByText('«Muy rápido»')).toBeInTheDocument();
    expect(within(survey).getByText(/atendió sólo el asistente/)).toBeInTheDocument();
    // La encuesta también en la cabecera de la conversación.
    expect(screen.getByText('Encuesta:')).toBeInTheDocument();
  });

  it('una nota interna no se ofrece para «Responder» (la vería la otra punta)', async () => {
    api.listConversationMessages.mockResolvedValue({
      items: [
        inboxMsg(1),
        inboxMsg(2, { party: 'company', internal: true, body: 'nota', sender: { displayName: 'Beto Despacho' } }),
      ],
      hasMore: false,
    });
    show();
    await screen.findByRole('region', { name: 'Nota interna de Beto Despacho' });
    expect(screen.getAllByRole('button', { name: /^Responder al mensaje/ })).toHaveLength(1);
  });
});

describe('Mensajes: lo de una nota nunca vuelve al cuadro del cliente (corrección 1)', () => {
  /** Lo que vio el borrador del cliente en toda la prueba: nunca el texto de la nota. */
  const watchClientDraft = () => {
    const seen: string[] = [];
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')?.value as (
      this: Storage,
      key: string,
      value: string,
    ) => void;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'chatDraft:conv-1') seen.push(value);
      original.call(this, key, value);
    });
    return { seen, restore: () => spy.mockRestore() };
  };

  const OWN_NOTE = inboxMsg(2, {
    party: 'company',
    isMine: true,
    canEdit: true,
    internal: true,
    body: 'Nota original',
    clientMessageId: 'cm-2',
    sender: { displayName: 'Ana Operadora' },
    createdAt: new Date().toISOString(),
  });

  it('descartar una nota que no se envió la devuelve al borrador de notas con su mención, en modo nota', async () => {
    const draft = watchClientDraft();
    api.sendConversationNote.mockRejectedValue(new ApiError(400, ['Mencionaste a alguien que no atiende este canal']));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Nota interna' }));
    const box = screen.getByRole('combobox', { name: 'Nota interna' });
    fireEvent.change(box, { target: { value: 'Ojo @', selectionStart: 5, selectionEnd: 5 } });
    await screen.findAllByRole('option');
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    // Vuelve a la nota (no al mensaje al cliente), con la mención.
    const back = screen.getByRole('combobox', { name: 'Nota interna' });
    expect(back).toHaveValue('Ojo @Beto Despacho');
    expect(readNoteDraft('conv-1').mentions).toEqual([{ userId: 'u-2', fullName: 'Beto Despacho', start: 4 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toHaveValue('');
    expect(draft.seen.some((v) => v.includes('Ojo'))).toBe(false);
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBeNull();
    draft.restore();
  });

  it('una edición de nota rechazada (4xx) vuelve al cuadro de la nota, nunca al del cliente', async () => {
    const draft = watchClientDraft();
    sessionStorage.setItem('chatDraft:conv-1', 'Para el cliente');
    api.listConversationMessages.mockResolvedValue({ items: [inboxMsg(1), OWN_NOTE], hasMore: false });
    api.editConversationMessage.mockRejectedValue(new ApiError(409, ['Pasaron los 15 minutos para editar']));
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Editar tu nota/ }));
    const box = screen.getByRole('textbox', { name: 'Nota interna' });
    expect(box).toHaveValue('Nota original');
    fireEvent.change(box, { target: { value: 'Nota corregida' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Nota interna' })).toHaveValue('Nota corregida'));
    expect(readNoteDraft('conv-1').text).toBe('Nota corregida');
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBe('Para el cliente');
    expect(draft.seen.some((v) => v.includes('corregida'))).toBe(false);
    draft.restore();
  });

  it('si ya se salió de la conversación, la edición de nota rechazada queda en el borrador de notas', async () => {
    const draft = watchClientDraft();
    let reject: (error: unknown) => void = () => undefined;
    api.listConversationMessages.mockResolvedValue({ items: [inboxMsg(1), OWN_NOTE], hasMore: false });
    api.editConversationMessage.mockImplementation(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Editar tu nota/ }));
    const box = screen.getByRole('textbox', { name: 'Nota interna' });
    fireEvent.change(box, { target: { value: 'Nota sin montar' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(api.editConversationMessage).toHaveBeenCalled());
    cleanup();
    reject(new ApiError(409, ['Pasaron los 15 minutos para editar']));
    await waitFor(() => expect(readNoteDraft('conv-1').text).toBe('Nota sin montar'));
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBeNull();
    expect(draft.seen.some((v) => v.includes('sin montar'))).toBe(false);
    draft.restore();
  });

  it('con la conversación abierta, si llega otra mención se vuelve a marcar leída (una vez por subida)', async () => {
    api.getConversation.mockResolvedValue(inboxConversation({ unreadMentions: 1 }));
    const client = newQueryClient();
    render(
      <ChatProviders client={client} socket={fakeSocket().value} url="/messages/conv-1">
        <Routes>
          <Route path="/messages/:id" element={<Messages />} />
        </Routes>
      </ChatProviders>,
    );
    await waitFor(() => expect(api.markMentionsRead).toHaveBeenCalledTimes(1));
    api.getConversation.mockResolvedValue(inboxConversation({ unreadMentions: 0 }));
    await act(() => client.invalidateQueries({ queryKey: inboxKeys.detail('conv-1') }));
    await waitFor(() =>
      expect(client.getQueryData<InboxConversation>(inboxKeys.detail('conv-1'))?.unreadMentions).toBe(0),
    );
    // Llega otra mención mientras se mira: se vuelve a marcar.
    api.getConversation.mockResolvedValue(inboxConversation({ unreadMentions: 1 }));
    await act(() => client.invalidateQueries({ queryKey: inboxKeys.detail('conv-1') }));
    await waitFor(() => expect(api.markMentionsRead).toHaveBeenCalledTimes(2));
    // Releer lo mismo (sin marcarse todavía) no repite el pedido.
    await act(() => client.invalidateQueries({ queryKey: inboxKeys.detail('conv-1') }));
    expect(api.markMentionsRead).toHaveBeenCalledTimes(2);
  });
});
