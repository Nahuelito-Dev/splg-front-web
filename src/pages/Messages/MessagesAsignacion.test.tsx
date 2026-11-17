import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';
import { inboxConversation, inboxMsg } from '../../test/inboxFixtures';
import type { InboxAccess } from '../../features/chat/useInboxAccess';
import type { ChatStatus } from '../../services/api/types';

const access = vi.hoisted(() => ({
  value: { customers: true, drivers: true, configure: true, claims: true, any: true } as InboxAccess,
}));
const api = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  listConversationMessages: vi.fn(),
  readConversation: vi.fn(() => Promise.resolve()),
  getChatSettings: vi.fn(),
  listCompanyTemplates: vi.fn(() => Promise.resolve({ items: [] })),
  getConversationSuggestions: vi.fn(() => Promise.resolve({ basedOnSeq: 1, items: [] })),
  getInboxSummary: vi.fn(),
  listConversationAssignees: vi.fn(() => Promise.resolve({ items: [] })),
}));
const statusApi = vi.hoisted(() => ({ getMyChatStatus: vi.fn(), updateMyChatStatus: vi.fn() }));
const notifyMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }));

vi.mock('../../hooks/usePermiso', () => ({ usePermiso: () => ({ allowed: true, known: true }) }));
vi.mock('../../features/chat/useInboxAccess', () => ({ useInboxAccess: () => access.value }));
vi.mock('../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../services/api/chatAssignment', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...statusApi,
}));
vi.mock('../../services/queries/users', () => ({ useMyAccount: () => ({ data: { user_id: 'u-me' } }) }));
vi.mock('../../common/components/useCompanyDisplayName', () => ({ useCompanyDisplayName: () => 'Gas Norte' }));
vi.mock('../../hooks/reduxHooks', () => ({ useAppSelector: () => 'admin@splg.com' }));
vi.mock('../../services/queries/claims', () => ({ useClaim: () => ({ data: undefined, isPending: true }) }));
vi.mock('../../utils/notifications', () => ({ notify: notifyMock, confirm: vi.fn(() => Promise.resolve(true)) }));
vi.mock('../../features/chat/inbox/BroadcastDriversModal', () => ({ BroadcastDriversModal: () => null }));

import { staffTypingStore } from '../../features/chat/staffTyping';
import { useInboxBridge } from '../../features/chat/useInboxBridge';
import { Messages } from './Messages';

const SETTINGS = {
  customerChatEnabled: true,
  openNow: true,
  nextOpenAt: null,
  autoAssignEnabled: true,
  autoAssignMaxOpen: 5,
};

const status = (over: Partial<ChatStatus> = {}): ChatStatus => ({
  status: 'online',
  connected: true,
  available: true,
  maxOpen: 5,
  maxOpenOverride: null,
  openAssigned: 2,
  channels: ['staff_customer', 'staff_driver'],
  ...over,
});

beforeEach(() => {
  access.value = { customers: true, drivers: true, configure: true, claims: true, any: true };
  Object.values(api).forEach((fn) => fn.mockClear());
  Object.values(statusApi).forEach((fn) => fn.mockReset());
  Object.values(notifyMock).forEach((fn) => fn.mockClear());
  staffTypingStore.reset();
  api.listConversations.mockResolvedValue({ items: [inboxConversation()], total: 1, counts: { open: 1 } });
  api.getConversation.mockResolvedValue(inboxConversation());
  api.listConversationMessages.mockResolvedValue({ items: [inboxMsg(1)], hasMore: false });
  api.getChatSettings.mockResolvedValue(SETTINGS);
  api.getInboxSummary.mockResolvedValue({
    unassigned: 1,
    mine: 0,
    awaitingHuman: 0,
    unread: 0,
    attention: 0,
    mentions: 0,
  });
  statusApi.getMyChatStatus.mockResolvedValue(status());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const Bridge = () => {
  useInboxBridge(true);
  return null;
};

const show = (url = '/messages') => {
  const socket = fakeSocket();
  render(
    <ChatProviders client={newQueryClient()} socket={socket.value} url={url}>
      <Bridge />
      <Routes>
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
      </Routes>
    </ChatProviders>,
  );
  return socket;
};

/** La fila de la lista (el detalle también tiene un enlace con el nombre, a la ficha de la persona). */
const listRow = async () =>
  (await screen.findAllByRole('link', { name: /Lucía Benítez/ })).find((link) =>
    link.getAttribute('href')?.startsWith('/messages/'),
  ) as HTMLElement;

const region = () => screen.findByRole('region', { name: 'Tu estado en la bandeja' });

describe('Bandeja: «En línea / Ausente»', () => {
  it('en línea y disponible: el interruptor prendido y cuántas tiene sobre su tope', async () => {
    show();
    const bar = await region();
    expect(await within(bar).findByRole('switch', { name: 'En línea para recibir conversaciones' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(bar).getByRole('status')).toHaveTextContent('En línea');
    expect(within(bar).getByText('2 de 5 abiertas')).toBeInTheDocument();
  });

  it('en línea pero fuera del horario: lo dice (con el panel abierto y la empresa cerrada)', async () => {
    statusApi.getMyChatStatus.mockResolvedValue(status({ available: false }));
    api.getChatSettings.mockResolvedValue({ ...SETTINGS, openNow: false, nextOpenAt: '2026-11-18T12:00:00.000Z' });
    show();
    const bar = await region();
    expect(
      await within(bar).findByText('En línea, pero fuera del horario de atención · 2 de 5 abiertas'),
    ).toBeInTheDocument();
  });

  it('en línea pero sin conexión en tiempo real: lo dice', async () => {
    statusApi.getMyChatStatus.mockResolvedValue(status({ connected: false, available: false }));
    show();
    const bar = await region();
    expect(
      await within(bar).findByText('En línea, pero sin conexión en tiempo real · 2 de 5 abiertas'),
    ).toBeInTheDocument();
  });

  it('en el tope: lo avisa', async () => {
    statusApi.getMyChatStatus.mockResolvedValue(status({ openAssigned: 5 }));
    show();
    expect(await within(await region()).findByText('5 de 5 abiertas · llegaste a tu tope')).toBeInTheDocument();
  });

  it('ausente: el interruptor apagado; prenderlo manda `online` y avisa', async () => {
    statusApi.getMyChatStatus
      .mockResolvedValueOnce(status({ status: 'away', available: false, openAssigned: 1 }))
      .mockResolvedValue(status({ openAssigned: 2 }));
    // La respuesta del PUT es vieja (1): manda lo que se relee después, con lo que ya repartió (2).
    statusApi.updateMyChatStatus.mockResolvedValue(status({ openAssigned: 1 }));
    show();
    const bar = await region();
    const toggle = await within(bar).findByRole('switch', { name: 'En línea para recibir conversaciones' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(within(bar).getByRole('status')).toHaveTextContent('Ausente');
    expect(within(bar).getByText('No te llegan conversaciones solas · 1 abiertas')).toBeInTheDocument();
    fireEvent.click(toggle);
    await waitFor(() => expect(statusApi.updateMyChatStatus).toHaveBeenCalledWith({ status: 'online' }));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect(await within(bar).findByText('2 de 5 abiertas')).toBeInTheDocument();
    expect(statusApi.getMyChatStatus).toHaveBeenCalledTimes(2);
    expect(notifyMock.success).toHaveBeenCalledWith('Estás en línea');
  });

  it('si el cambio falla, lo dice y no da por hecho el cambio', async () => {
    statusApi.updateMyChatStatus.mockRejectedValue(new Error('403'));
    show();
    const bar = await region();
    const toggle = await within(bar).findByRole('switch', { name: 'En línea para recibir conversaciones' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(within(bar).getByRole('status')).toHaveTextContent('En línea');
    expect(within(bar).getByText('2 de 5 abiertas')).toBeInTheDocument();
    fireEvent.click(toggle);
    await waitFor(() => expect(notifyMock.error).toHaveBeenCalled());
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(within(bar).getByRole('status')).toHaveTextContent('En línea');
    expect(within(bar).getByText('2 de 5 abiertas')).toBeInTheDocument();
    expect(within(bar).queryByText(/No te llegan conversaciones solas/)).not.toBeInTheDocument();
    expect(notifyMock.success).not.toHaveBeenCalled();
  });

  it('con la asignación automática apagada, lo aclara', async () => {
    api.getChatSettings.mockResolvedValue({ ...SETTINGS, autoAssignEnabled: false });
    show();
    expect(
      await within(await region()).findByText('2 de 5 abiertas · la asignación automática está apagada'),
    ).toBeInTheDocument();
  });

  it('`chat:team` de quien mira pone al día el estado; el de otra persona, no', async () => {
    const socket = show();
    const bar = await region();
    await within(bar).findByText('2 de 5 abiertas');
    act(() =>
      socket.fire('chat:team', {
        userId: 'u-otro',
        status: 'away',
        connected: true,
        available: false,
        openAssigned: 0,
      }),
    );
    // React Query avisa a la pantalla en la próxima vuelta: se espera antes de mirar que no cambió.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(within(bar).getByText('2 de 5 abiertas')).toBeInTheDocument();
    act(() =>
      socket.fire('chat:team', { userId: 'u-me', status: 'online', connected: true, available: true, openAssigned: 3 }),
    );
    expect(await within(bar).findByText('3 de 5 abiertas')).toBeInTheDocument();
    act(() =>
      socket.fire('chat:team', { userId: 'u-me', status: 'away', connected: true, available: false, openAssigned: 3 }),
    );
    await waitFor(() => expect(within(bar).getByRole('status')).toHaveTextContent('Ausente'));
  });

  it('si no se puede leer el estado, lo dice y deja reintentar', async () => {
    statusApi.getMyChatStatus.mockRejectedValueOnce(new Error('boom'));
    show();
    expect(await screen.findByText('No se pudo leer tu estado.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a leer tu estado' }));
    expect(await within(await region()).findByText('2 de 5 abiertas')).toBeInTheDocument();
  });

  it('quien no atiende ningún canal no ve la bandeja ni pide su estado', async () => {
    access.value = { customers: false, drivers: false, configure: true, claims: false, any: false };
    show();
    expect(await screen.findByText('No tenés permiso para atender mensajes')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tu estado en la bandeja' })).not.toBeInTheDocument();
    expect(statusApi.getMyChatStatus).not.toHaveBeenCalled();
  });
});

describe('Bandeja: asignada automáticamente', () => {
  const auto = inboxConversation({
    assignedTo: { userId: 'u-me', fullName: 'Ana Operadora' },
    assignedAutomatically: true,
  });

  it('la marca en la lista y el badge en el detalle', async () => {
    api.listConversations.mockResolvedValue({ items: [auto], total: 1, counts: { open: 1 } });
    api.getConversation.mockResolvedValue(auto);
    show('/messages/conv-1');
    await screen.findByRole('heading', { name: /Lucía Benítez/ });
    const row = await listRow();
    expect(within(row).getByText(/^Automática/)).toBeInTheDocument();
    expect(await screen.findByText('Asignada automáticamente')).toBeInTheDocument();
  });

  it('asignada a mano, sin marca ni badge', async () => {
    const manual = { ...auto, assignedAutomatically: false };
    api.listConversations.mockResolvedValue({ items: [manual], total: 1, counts: { open: 1 } });
    api.getConversation.mockResolvedValue(manual);
    show('/messages/conv-1');
    await screen.findByRole('heading', { name: /Lucía Benítez/ });
    const row = await listRow();
    await screen.findByRole('heading', { name: /Lucía Benítez/ });
    expect(within(row).queryByText(/^Automática/)).not.toBeInTheDocument();
    expect(screen.queryByText('Asignada automáticamente')).not.toBeInTheDocument();
  });
});

describe('Bandeja: aviso de colisión (`chat:staff-typing`)', () => {
  const typing = (over: Record<string, unknown> = {}) => ({
    conversationId: 'conv-1',
    userId: 'u-beto',
    name: 'Beto Despacho',
    internal: false,
    until: new Date(Date.now() + 4000).toISOString(),
    ...over,
  });

  it('«Beto está respondiendo…» arriba del compositor, sin reemplazarlo', async () => {
    const socket = show('/messages/conv-1');
    const composer = await screen.findByRole('textbox', { name: /Mensaje/i });
    act(() => socket.fire('chat:staff-typing', typing()));
    expect(await screen.findByText('Beto Despacho está respondiendo…')).toBeInTheDocument();
    expect(composer).toBeInTheDocument();
  });

  it('se apaga al llegar el mensaje o la nota de esa persona, no el de otra', async () => {
    const socket = show('/messages/conv-1');
    await screen.findByRole('textbox', { name: /Mensaje/i });
    act(() => {
      socket.fire('chat:staff-typing', typing());
      socket.fire('chat:staff-typing', typing({ userId: 'u-caro', name: 'Caro Díaz', internal: true }));
    });
    expect(await screen.findByText('Beto Despacho y Caro Díaz están respondiendo…')).toBeInTheDocument();
    const fromStaff = (seq: number, userId: string, name: string, internal = false) => ({
      conversationId: 'conv-1',
      distributorId: 'd-1',
      seq,
      message: inboxMsg(seq, { party: 'company', sender: { displayName: name, userId }, internal }),
    });
    act(() => socket.fire('chat:message', fromStaff(2, 'u-beto', 'Beto Despacho')));
    expect(await screen.findByText('Caro Díaz escribe una nota interna…')).toBeInTheDocument();
    act(() => socket.fire('chat:message', fromStaff(3, 'u-caro', 'Caro Díaz', true)));
    await waitFor(() => expect(screen.queryByText(/Caro Díaz escribe/)).not.toBeInTheDocument());
  });

  it('una nota interna lo dice', async () => {
    const socket = show('/messages/conv-1');
    await screen.findByRole('textbox', { name: /Mensaje/i });
    act(() => socket.fire('chat:staff-typing', typing({ internal: true })));
    expect(await screen.findByText('Beto Despacho escribe una nota interna…')).toBeInTheDocument();
  });

  it('el de otra conversación no se muestra', async () => {
    const socket = show('/messages/conv-1');
    await screen.findByRole('textbox', { name: /Mensaje/i });
    act(() => socket.fire('chat:staff-typing', typing({ conversationId: 'conv-2' })));
    expect(screen.queryByText(/está respondiendo/)).not.toBeInTheDocument();
  });

  it('se apaga solo al llegar a `until`', async () => {
    const socket = show('/messages/conv-1');
    await screen.findByRole('textbox', { name: /Mensaje/i });
    act(() => socket.fire('chat:staff-typing', typing({ until: new Date(Date.now() + 300).toISOString() })));
    expect(await screen.findByText('Beto Despacho está respondiendo…')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Beto Despacho está respondiendo…')).not.toBeInTheDocument());
  });
});
