import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { conversation, fakeSocket, msg, newQueryClient, ticketSummary } from '../../test/chatFixtures';
import { useSupportChatBridge } from '../../features/chat/useSupportChatBridge';
import type { Conversation } from '../../services/api/types';

const api = vi.hoisted(() => ({
  getCompanyChat: vi.fn(),
  listCompanyChatMessages: vi.fn(),
  sendCompanyChatMessage: vi.fn(),
  readCompanyChat: vi.fn(() => Promise.resolve()),
  openTicketFromCompanyChat: vi.fn(),
}));
vi.mock('../../services/api/supportChat', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
const perms = vi.hoisted(() => ({ canManage: true }));
vi.mock('../../common/support/useSupportAccessActions', () => ({
  useSupportAccessPermissions: () => ({ canView: true, canManage: perms.canManage, isPending: false }),
}));
vi.mock('../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: { name: 'OrixTech' } }) }));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { CompanyChatPanel } from './CompanyChatPanel';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
beforeEach(() => {
  perms.canManage = true;
  vi.clearAllMocks();
});

const Bridge = () => {
  useSupportChatBridge('company', 'Mensaje de OrixTech');
  return null;
};

const show = (chat: Conversation | null, messages = [msg(1)]) => {
  api.getCompanyChat.mockResolvedValue({ conversation: chat });
  api.listCompanyChatMessages.mockResolvedValue({ items: messages, hasMore: false });
  const socket = fakeSocket();
  render(
    <ChatProviders client={newQueryClient()} socket={socket.value} url="/support">
      <Bridge />
      <CompanyChatPanel />
    </ChatProviders>,
  );
  return socket;
};

describe('CompanyChatPanel: el chat de la empresa con la plataforma', () => {
  it('sin chat abierto invita a escribir, y el primer mensaje lo abre', async () => {
    show(null);
    expect(await screen.findAllByText('Escribinos y te respondemos')).not.toHaveLength(0);
    api.sendCompanyChatMessage.mockImplementation((body: { clientMessageId: string; body: string }) =>
      Promise.resolve(
        msg(1, { conversationId: 'c-new', isMine: true, body: body.body, clientMessageId: body.clientMessageId }),
      ),
    );
    api.getCompanyChat.mockResolvedValue({ conversation: conversation({ id: 'c-new' }) });
    api.listCompanyChatMessages.mockResolvedValue({
      items: [msg(1, { conversationId: 'c-new', body: 'hola' })],
      hasMore: false,
    });
    fireEvent.change(await screen.findByRole('textbox', { name: 'Mensaje' }), { target: { value: 'hola' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Mensaje' }), { key: 'Enter' });
    await waitFor(() => expect(api.getCompanyChat).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('hola')).toBeInTheDocument();
  });

  it.each([
    ['tarda', () => new Promise<never>(() => undefined)],
    ['falla', () => Promise.reject(new Error('caído'))],
  ])('el primer mensaje se ve confirmado aunque releer el chat abierto %s (corrección 1)', async (_caso, next) => {
    show(null);
    api.sendCompanyChatMessage.mockImplementation((body: { clientMessageId: string; body: string }) =>
      Promise.resolve(
        msg(1, { conversationId: 'c-new', isMine: true, body: body.body, clientMessageId: body.clientMessageId }),
      ),
    );
    api.getCompanyChat.mockImplementation(next);
    api.listCompanyChatMessages.mockResolvedValue({ items: [], hasMore: false });
    const box = await screen.findByRole('textbox', { name: 'Mensaje' });
    fireEvent.change(box, { target: { value: 'hola, ¿me ayudan?' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(await screen.findByText('hola, ¿me ayudan?')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Enviando…')).not.toBeInTheDocument());
    expect(screen.getByText('hola, ¿me ayudan?')).toBeInTheDocument();
    expect(screen.getByText(/Esperando que alguien de OrixTech te atienda/)).toBeInTheDocument();
  });

  it('dice quién atiende (nombre de pila) y el estado de la conexión', async () => {
    show(conversation({ attendedBy: { displayName: 'Lucía' } }));
    expect(await screen.findByText('Te está atendiendo Lucía')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('En vivo');
  });

  it('con sólo «Ver soporte», lee pero no escribe', async () => {
    perms.canManage = false;
    show(conversation());
    expect(await screen.findByText(/para escribir hace falta el permiso «Gestionar soporte»/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir ticket con esto' })).not.toBeInTheDocument();
  });

  it('fuera de horario ofrece pasarlo a un ticket con los mensajes elegidos', async () => {
    show(conversation(), [
      msg(1, { party: 'company', isMine: true, body: 'Se cayó el push' }),
      msg(2, { kind: 'auto_reply', templateKey: 'fuera_de_horario', body: 'Ahora no hay nadie en línea.' }),
    ]);
    await screen.findByText('Ahora no hay nadie en línea.');
    const offer = screen.getAllByRole('button', { name: 'Abrir ticket con esto' });
    fireEvent.click(offer[offer.length - 1]);
    const bar = screen.getByRole('region', { name: 'Elegir mensajes para el ticket' });
    expect(within(bar).getByText('2 mensajes para el ticket')).toBeInTheDocument();
    fireEvent.click(within(bar).getByRole('button', { name: 'Abrir ticket' }));
    fireEvent.change(await screen.findByLabelText(/Asunto/), { target: { value: 'Push caído' } });
    api.openTicketFromCompanyChat.mockResolvedValue({ id: 't-9', number: 'T-000009' });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ticket' }));
    await waitFor(() =>
      expect(api.openTicketFromCompanyChat).toHaveBeenCalledWith(
        'c-1',
        expect.objectContaining({ subject: 'Push caído', fromSeq: 1, toSeq: 2 }),
        expect.stringMatching(/^[0-9a-f-]{36}$/),
      ),
    );
  });

  it('elegir mensajes: sin ninguno no deja abrir el ticket', async () => {
    show(conversation(), [msg(1, { body: 'uno', createdAt: '2020-01-01T10:00:00.000Z' })]);
    await screen.findByText('uno');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ticket con esto' }));
    const box = screen.getByRole('checkbox', { name: /Elegir el mensaje/ });
    expect(box).toBeChecked();
    fireEvent.click(box);
    const bar = screen.getByRole('region', { name: 'Elegir mensajes para el ticket' });
    expect(within(bar).getByText('Elegí al menos un mensaje del chat')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Abrir ticket' })).toBeDisabled();
  });

  it('la tarjeta del ticket abierto desde el chat cambia de estado en vivo (ticket:updated)', async () => {
    const socket = show(conversation({ ticketsFromHere: [ticketSummary({ status: 'new' })] }));
    const cards = await screen.findByRole('list', { name: 'Tickets abiertos desde este chat' });
    expect(within(cards).getByText('Nuevo')).toBeInTheDocument();
    act(() =>
      socket.fire('ticket:updated', {
        ticketId: 't-1',
        number: 'T-000001',
        distributorId: 'd-1',
        conversationId: 'c-t1',
        originConversationId: 'c-1',
        status: 'resolved',
        priority: 'normal',
        subject: 'Factura duplicada',
      }),
    );
    expect(await within(cards).findByText('Resuelto')).toBeInTheDocument();
  });
});
