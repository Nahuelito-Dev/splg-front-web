import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';
import { inboxConversation, inboxMsg } from '../../test/inboxFixtures';
import type { InboxAccess } from '../../features/chat/useInboxAccess';
import type { InboxConversation } from '../../services/api/types';

const access = vi.hoisted(() => ({
  value: { customers: true, drivers: true, configure: true, claims: true, any: true } as InboxAccess,
}));
const api = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  listConversationMessages: vi.fn(),
  sendConversationMessage: vi.fn(),
  editConversationMessage: vi.fn(),
  assignConversation: vi.fn(),
  closeConversation: vi.fn(),
  reopenConversation: vi.fn(),
  readConversation: vi.fn(() => Promise.resolve()),
  createClaimFromConversation: vi.fn(),
  getChatSettings: vi.fn(),
  listCompanyTemplates: vi.fn(() => Promise.resolve({ items: [] })),
  getConversationSuggestions: vi.fn(),
  getInboxSummary: vi.fn(),
  listConversationAssignees: vi.fn(),
}));
const confirmMock = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));

vi.mock('../../features/chat/useInboxAccess', () => ({ useInboxAccess: () => access.value }));
vi.mock('../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../services/queries/users', () => ({ useMyAccount: () => ({ data: { user_id: 'u-me' } }) }));
vi.mock('../../common/components/useCompanyDisplayName', () => ({ useCompanyDisplayName: () => 'Gas Norte' }));
vi.mock('../../hooks/reduxHooks', () => ({ useAppSelector: () => 'admin@splg.com' }));
vi.mock('../../services/queries/claims', () => ({ useClaim: () => ({ data: undefined, isPending: true }) }));
vi.mock('../../services/queries/customers', () => ({
  useCustomerOrders: () => ({
    data: { orders: [{ order_id: 'o-123456', created_at: '2026-11-10T12:00:00.000Z', status: 'delivered' }] },
    isPending: false,
  }),
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  confirm: confirmMock,
}));
vi.mock('../../features/chat/inbox/BroadcastDriversModal', () => ({
  BroadcastDriversModal: ({ open }: { open: boolean }) => (open ? <p>modal de aviso</p> : null),
}));

import { useInboxBridge } from '../../features/chat/useInboxBridge';
import { inboxKeys } from '../../services/queries/inbox';
import { Messages } from './Messages';

const list = (items: InboxConversation[], counts = { unassigned: 2, mine: 1, open: 5 }) => ({
  items,
  total: items.length,
  counts,
});

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
  firstResponseTargetMinutes: 30,
  openNow: true,
  nextOpenAt: null,
};

beforeEach(() => {
  confirmMock.mockClear();
  access.value = { customers: true, drivers: true, configure: true, claims: true, any: true };
  Object.values(api).forEach((fn) => fn.mockClear());
  api.listConversations.mockResolvedValue(list([inboxConversation()]));
  api.getConversation.mockResolvedValue(inboxConversation());
  api.listConversationMessages.mockResolvedValue({ items: [inboxMsg(1)], hasMore: false });
  api.getChatSettings.mockResolvedValue(SETTINGS);
  api.getConversationSuggestions.mockResolvedValue({ basedOnSeq: 1, items: [] });
  api.getInboxSummary.mockResolvedValue({ unassigned: 2, mine: 1, awaitingHuman: 0, unread: 1 });
  api.listConversationAssignees.mockResolvedValue({
    items: [
      { userId: 'u-me', fullName: 'Ana Operadora' },
      { userId: 'u-2', fullName: 'Beto Despacho' },
    ],
  });
});
afterEach(cleanup);

const show = (url = '/messages') =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url={url}>
      <Routes>
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
      </Routes>
    </ChatProviders>,
  );

describe('Mensajes: la bandeja', () => {
  it('pestañas con contadores; «Sin asignar» pide las abiertas sin asignar', async () => {
    show();
    expect(await screen.findByRole('tab', { name: /Sin asignar.*2/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Mías.*1/ })).toBeInTheDocument();
    expect(api.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ assigned: 'none', status: 'open', limit: 50, offset: 0 }),
    );
    const row = await screen.findByRole('link', { name: /Lucía Benítez/ });
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(within(row).getByText(/Sin asignar/)).toBeInTheDocument();
  });

  it('«Sin asignar» y «Mías» cuentan desde el resumen de la bandeja; «Todas», desde la lista', async () => {
    api.getInboxSummary.mockResolvedValue({ unassigned: 7, mine: 4, awaitingHuman: 1, unread: 3 });
    show();
    expect(await screen.findByRole('tab', { name: /Sin asignar.*7/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mías.*4/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Todas.*5/ })).toBeInTheDocument();
    expect(api.getInboxSummary).toHaveBeenCalled();
  });

  it('con un filtro de canal, «Sin asignar» y «Mías» son los de la lista de ese canal, no los del resumen', async () => {
    api.getInboxSummary.mockResolvedValue({ unassigned: 7, mine: 4, awaitingHuman: 1, unread: 3 });
    show();
    expect(await screen.findByRole('tab', { name: /Sin asignar.*7/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choferes' }));
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith(expect.objectContaining({ channel: 'staff_driver' })),
    );
    expect(await screen.findByRole('tab', { name: /Sin asignar.*2/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mías.*1/ })).toBeInTheDocument();
  });

  it('«Mías» y «Todas» cambian lo que se pide; el filtro de canal también', async () => {
    show();
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    fireEvent.click(screen.getByRole('tab', { name: /Mías/ }));
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ assigned: 'me', status: 'open' }),
      ),
    );
    fireEvent.click(screen.getByRole('tab', { name: /Todas/ }));
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith({ status: 'open', limit: 50, offset: 0 }),
    );
    // «Todas» son las abiertas: su número es `counts.open` (5) y coincide con la lista.
    expect(screen.getByRole('tab', { name: /Todas.*5/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /Cerradas/ }));
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith({ status: 'closed', limit: 50, offset: 0 }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Choferes' }));
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith(expect.objectContaining({ channel: 'staff_driver' })),
    );
  });

  it('la búsqueda se manda desde 3 letras', async () => {
    show();
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar conversaciones' }), { target: { value: 'lu' } });
    expect(screen.getByText(/al menos 3 letras/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar conversaciones' }), { target: { value: 'luc' } });
    await waitFor(() => expect(api.listConversations).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'luc' })), {
      timeout: 2000,
    });
  });

  it('vacío y error con reintento', async () => {
    api.listConversations.mockResolvedValueOnce(list([], { unassigned: 0, mine: 0, open: 0 }));
    show();
    expect(await screen.findByText('No hay nadie esperando')).toBeInTheDocument();
    cleanup();
    api.listConversations.mockRejectedValueOnce(new Error('caído'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('link', { name: /Lucía Benítez/ })).toBeInTheDocument();
  });

  it('sólo de choferes: sin filtros de canal; sin ningún permiso, el aviso', async () => {
    access.value = { customers: false, drivers: true, configure: false, claims: false, any: true };
    show();
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    expect(screen.queryByRole('button', { name: 'Choferes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Configuración' })).not.toBeInTheDocument();
    cleanup();
    access.value = { customers: false, drivers: false, configure: false, claims: false, any: false };
    show();
    expect(screen.getByText('No tenés permiso para atender mensajes')).toBeInTheDocument();
    expect(api.listConversations).toHaveBeenCalledTimes(1);
  });

  it('fuera de horario lo dice arriba de la bandeja', async () => {
    api.getChatSettings.mockResolvedValue({ ...SETTINGS, openNow: false, nextOpenAt: '2026-11-16T12:00:00.000Z' });
    show();
    expect(await screen.findByText(/Fuera de horario · Vuelve a atender el .*16/)).toBeInTheDocument();
  });

  it('«Avisar a varios choferes» abre el aviso', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Avisar a varios choferes' }));
    expect(screen.getByText('modal de aviso')).toBeInTheDocument();
  });
});

describe('Mensajes: una conversación', () => {
  it('muestra el hilo y el contexto; «Tomar» se la asigna a quien mira', async () => {
    const mine = inboxConversation({ assignedTo: { userId: 'u-me', fullName: 'Ana Operadora' } });
    api.assignConversation.mockImplementation(() => {
      api.getConversation.mockResolvedValue(mine);
      return Promise.resolve(mine);
    });
    show('/messages/conv-1');
    expect(await screen.findByRole('heading', { name: /Lucía Benítez/ })).toBeInTheDocument();
    expect(await within(screen.getByRole('log', { name: 'Mensajes' })).findByText('hola 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tomar' }));
    await waitFor(() => expect(api.assignConversation).toHaveBeenCalledWith('conv-1', 'u-me'));
    expect(await screen.findByText(/La atendés vos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tomar' })).not.toBeInTheDocument();
  });

  it('asignada a otra persona: «Quitársela a …» pide confirmación antes de tomarla', async () => {
    api.getConversation.mockResolvedValue(
      inboxConversation({ assignedTo: { userId: 'u-2', fullName: 'Beto Despacho' } }),
    );
    api.assignConversation.mockResolvedValue(
      inboxConversation({ assignedTo: { userId: 'u-me', fullName: 'Ana Operadora' } }),
    );
    show('/messages/conv-1');
    expect(await screen.findByText(/Atiende Beto Despacho/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tomar' })).not.toBeInTheDocument();
    confirmMock.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Quitársela a Beto' }));
    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Quitársela a Beto Despacho?' })),
    );
    expect(api.assignConversation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Quitársela a Beto' }));
    await waitFor(() => expect(api.assignConversation).toHaveBeenCalledWith('conv-1', 'u-me'));
  });

  it('sin asignar, «Tomar» va directo sin preguntar', async () => {
    api.assignConversation.mockResolvedValue(inboxConversation({ assignedTo: { userId: 'u-me', fullName: 'Ana' } }));
    show('/messages/conv-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Tomar' }));
    await waitFor(() => expect(api.assignConversation).toHaveBeenCalledWith('conv-1', 'u-me'));
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('el modal de asignar no pierde lo elegido si la ficha se refresca mientras está abierto', async () => {
    const client = newQueryClient();
    render(
      <ChatProviders client={client} socket={fakeSocket().value} url="/messages/conv-1">
        <Routes>
          <Route path="/messages/:id" element={<Messages />} />
        </Routes>
      </ChatProviders>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Más acciones' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Asignar a/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Asignar la conversación' });
    fireEvent.click(await within(dialog).findByRole('radio', { name: /Beto Despacho/ }));
    await act(async () => {
      client.setQueryData(inboxKeys.detail('conv-1'), inboxConversation({ unreadCount: 3 }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(within(dialog).getByRole('radio', { name: /Beto Despacho/ })).toBeChecked();
  });

  it('cerrar pide confirmación y deja la conversación en lectura; reabrir la vuelve a abrir', async () => {
    const closed = inboxConversation({ status: 'closed', canWrite: false, closedReason: 'manual' });
    // La API pasa a devolver la conversación como quedó (la bandeja la relee después de cada acción).
    api.closeConversation.mockImplementation(() => {
      api.getConversation.mockResolvedValue(closed);
      return Promise.resolve(closed);
    });
    api.reopenConversation.mockImplementation(() => {
      api.getConversation.mockResolvedValue(inboxConversation());
      return Promise.resolve(inboxConversation());
    });
    show('/messages/conv-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(api.closeConversation).toHaveBeenCalledWith('conv-1'));
    expect(confirmMock).toHaveBeenCalled();
    expect(await screen.findByText(/La conversación está cerrada. Reabrila para escribir/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    await waitFor(() => expect(api.reopenConversation).toHaveBeenCalledWith('conv-1'));
    expect(await screen.findByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument();
  });

  it('«Editar» sólo si el mensaje lo permite y la conversación deja escribir', async () => {
    const own = inboxMsg(2, {
      party: 'company',
      isMine: true,
      canEdit: true,
      sender: { displayName: 'Ana Operadora' },
      body: 'mensaje propio',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
    });
    api.listConversationMessages.mockResolvedValue({ items: [inboxMsg(1), own], hasMore: false });
    api.getConversation.mockResolvedValue(
      inboxConversation({ status: 'closed', canWrite: false, closedReason: 'manual' }),
    );
    show('/messages/conv-1');
    expect(
      await within(await screen.findByRole('log', { name: 'Mensajes' })).findByText('mensaje propio'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar tu mensaje/ })).not.toBeInTheDocument();
  });

  it('un 409 al cerrar se muestra y relee la conversación', async () => {
    const { notify } = await import('../../utils/notifications');
    const { ApiError } = await import('../../services/api/errors');
    api.closeConversation.mockRejectedValue(new ApiError(409, ['Ya estaba cerrada'], 'CONVERSATION_CLOSED'));
    show('/messages/conv-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    await waitFor(() => expect(api.getConversation.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('asignar a otra persona del personal', async () => {
    api.assignConversation.mockResolvedValue(
      inboxConversation({ assignedTo: { userId: 'u-2', fullName: 'Beto Despacho' } }),
    );
    show('/messages/conv-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Más acciones' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Asignar a/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Asignar la conversación' });
    fireEvent.click(await within(dialog).findByRole('radio', { name: /Beto Despacho/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.assignConversation).toHaveBeenCalledWith('conv-1', 'u-2'));
  });

  it('crear un reclamo desde una conversación general pide el pedido y valida como el back', async () => {
    api.createClaimFromConversation.mockResolvedValue({
      claimId: 'cl-1',
      conversation: inboxConversation({ linkedClaimId: 'cl-1' }),
    });
    show('/messages/conv-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Crear reclamo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear reclamo desde la conversación' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear reclamo' }));
    expect(await within(dialog).findByText('Elegí el pedido reclamado')).toBeInTheDocument();
    expect(api.createClaimFromConversation).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Pedido reclamado/), { target: { value: 'o-123456' } });
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: 'Garrafa con pérdida' } });
    fireEvent.change(within(dialog).getByLabelText(/Descripción/), { target: { value: 'Lo contó en el chat' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear reclamo' }));
    await waitFor(() =>
      expect(api.createClaimFromConversation).toHaveBeenCalledWith('conv-1', {
        reason: 'Garrafa con pérdida',
        description: 'Lo contó en el chat',
        orderId: 'o-123456',
      }),
    );
  });

  it('con un chofer no se ofrece crear reclamo', async () => {
    api.getConversation.mockResolvedValue(
      inboxConversation({
        channel: 'staff_driver',
        customer: null,
        driver: { id: 'u-cho', displayName: 'Diego Ferreyra' },
        counterpart: { party: 'driver', displayName: 'Diego Ferreyra' },
      }),
    );
    show('/messages/conv-1');
    expect(await screen.findByRole('heading', { name: /Diego Ferreyra/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear reclamo' })).not.toBeInTheDocument();
  });

  it('una conversación de otra empresa (404) lo dice sin mostrar nada', async () => {
    const { ApiError } = await import('../../services/api/errors');
    api.getConversation.mockRejectedValue(new ApiError(404, ['No existe']));
    show('/messages/conv-x');
    expect(await screen.findByText('La conversación no existe')).toBeInTheDocument();
  });
});

const SUGGESTION = {
  templateId: 'tpl-pago',
  key: 'medios_de_pago',
  title: 'Medios de pago',
  body: 'Hola Lucía, podés pagar en efectivo o con Mercado Pago.',
};

const Bridge = () => {
  useInboxBridge(true);
  return null;
};

describe('Mensajes: sugerencias de respuesta', () => {
  const showLive = () => {
    const socket = fakeSocket();
    render(
      <ChatProviders client={newQueryClient()} socket={socket.value} url="/messages/conv-1">
        <Bridge />
        <Routes>
          <Route path="/messages/:id" element={<Messages />} />
        </Routes>
      </ChatProviders>,
    );
    return socket;
  };

  it('las muestra arriba del compositor; un clic pega el texto para editar y no envía nada', async () => {
    api.getConversationSuggestions.mockResolvedValue({ basedOnSeq: 1, items: [SUGGESTION] });
    showLive();
    const group = await screen.findByRole('group', { name: 'Respuestas sugeridas' });
    const chip = within(group).getByRole('button', { name: /Usar «Medios de pago» en el mensaje/ });
    expect(api.getConversationSuggestions).toHaveBeenCalledWith('conv-1');
    fireEvent.click(chip);
    const composer = screen.getByRole('textbox', { name: 'Mensaje' });
    expect(composer).toHaveValue(SUGGESTION.body);
    expect(composer).toHaveFocus();
    expect(api.sendConversationMessage).not.toHaveBeenCalled();
  });

  it('con algo escrito, la sugerencia se suma donde está el cursor y el borrador queda combinado', async () => {
    sessionStorage.setItem('chatDraft:conv-1', 'Ramón,');
    api.getConversationSuggestions.mockResolvedValue({ basedOnSeq: 1, items: [SUGGESTION] });
    showLive();
    const composer = await screen.findByRole('textbox', { name: 'Mensaje' });
    expect(composer).toHaveValue('Ramón,');
    fireEvent.click(await screen.findByRole('button', { name: /Usar «Medios de pago»/ }));
    const combined = `Ramón, ${SUGGESTION.body}`;
    expect(composer).toHaveValue(combined);
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBe(combined);
    expect(api.sendConversationMessage).not.toHaveBeenCalled();
    sessionStorage.clear();
  });

  it('si se borra el último mensaje del cliente y no hay otro, las sugerencias se ocultan', async () => {
    api.getConversationSuggestions.mockResolvedValue({ basedOnSeq: 1, items: [SUGGESTION] });
    const socket = showLive();
    await screen.findByRole('group', { name: 'Respuestas sugeridas' });
    act(() =>
      socket.fire('chat:message-deleted', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        seq: 1,
        message: inboxMsg(1, { body: null, deleted: true, deletedAt: '2026-11-15T13:06:00.000Z' }),
      }),
    );
    expect(await screen.findByText('Mensaje eliminado')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Respuestas sugeridas' })).not.toBeInTheDocument();
    expect(api.getConversationSuggestions).toHaveBeenCalledTimes(1);
  });

  it('sin sugerencias no ocupan lugar', async () => {
    showLive();
    expect(await screen.findByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument();
    await waitFor(() => expect(api.getConversationSuggestions).toHaveBeenCalled());
    expect(screen.queryByRole('group', { name: 'Respuestas sugeridas' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sugeridas')).not.toBeInTheDocument();
  });

  it('se piden de nuevo cuando escribe el cliente, no cuando escribe la empresa', async () => {
    api.getConversationSuggestions.mockResolvedValue({ basedOnSeq: 1, items: [SUGGESTION] });
    const socket = showLive();
    await screen.findByRole('group', { name: 'Respuestas sugeridas' });
    expect(api.getConversationSuggestions).toHaveBeenCalledTimes(1);
    act(() =>
      socket.fire('chat:message', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        seq: 2,
        message: inboxMsg(2, { party: 'company', isMine: false, sender: { displayName: 'Beto' }, body: 'ya va' }),
      }),
    );
    expect(await screen.findByText('ya va')).toBeInTheDocument();
    expect(api.getConversationSuggestions).toHaveBeenCalledTimes(1);
    api.getConversationSuggestions.mockResolvedValue({
      basedOnSeq: 3,
      items: [{ ...SUGGESTION, templateId: 'tpl-horario', title: 'Horario', body: 'Atendemos de 9 a 18.' }],
    });
    act(() =>
      socket.fire('chat:message', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        seq: 3,
        message: inboxMsg(3, { body: '¿a qué hora abren?' }),
      }),
    );
    expect(await screen.findByRole('button', { name: /Usar «Horario»/ })).toBeInTheDocument();
    expect(api.getConversationSuggestions).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: /Usar «Medios de pago»/ })).not.toBeInTheDocument();
  });

  it('si fallan, lo dice y se puede reintentar', async () => {
    api.getConversationSuggestions.mockRejectedValueOnce(new Error('caído'));
    showLive();
    expect(await screen.findByText('No se pudieron traer las respuestas sugeridas.')).toBeInTheDocument();
    api.getConversationSuggestions.mockResolvedValue({ basedOnSeq: 1, items: [SUGGESTION] });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('group', { name: 'Respuestas sugeridas' })).toBeInTheDocument();
  });

  it('una conversación cerrada (sin compositor) no las pide', async () => {
    api.getConversation.mockResolvedValue(inboxConversation({ status: 'closed', canWrite: false }));
    showLive();
    expect(await screen.findByText(/La conversación está cerrada/)).toBeInTheDocument();
    expect(api.getConversationSuggestions).not.toHaveBeenCalled();
  });
});

describe('Mensajes: lo que manda el asistente', () => {
  it('en la lista, el último mensaje del asistente se ve con su firma corta; un aviso sin texto, como aviso', async () => {
    api.listConversations.mockResolvedValue(
      list([
        inboxConversation({
          lastMessage: { seq: 2, preview: 'Recibimos tu mensaje.', at: '2026-11-15T13:02:00.000Z', party: 'system' },
        }),
        inboxConversation({
          id: 'conv-2',
          lastMessage: { seq: 3, preview: null, at: '2026-11-15T13:03:00.000Z', party: 'system' },
        }),
      ]),
    );
    show();
    expect(await screen.findByText('Asistente: Recibimos tu mensaje.')).toBeInTheDocument();
    expect(screen.getByText('Aviso del sistema')).toBeInTheDocument();
  });

  it('va firmado con el nombre del asistente y con la marca «Respuesta automática»; los avisos del sistema no', async () => {
    api.listConversationMessages.mockResolvedValue({
      items: [
        inboxMsg(1),
        inboxMsg(2, {
          party: 'system',
          sender: null,
          kind: 'system',
          systemCode: 'received_ack',
          body: 'Recibimos tu mensaje.',
          automated: true,
          senderLabel: 'Gasito de Gas Norte',
        }),
        inboxMsg(3, {
          party: 'system',
          sender: null,
          kind: 'system',
          systemCode: 'claim_created',
          body: null,
          payload: { claimId: 'cl-1' },
        }),
      ],
      hasMore: false,
    });
    show('/messages/conv-1');
    const log = await screen.findByRole('log', { name: 'Mensajes' });
    const ack = (await within(log).findByText('Recibimos tu mensaje.')).closest('li') as HTMLElement;
    expect(within(ack).getByText('Gasito de Gas Norte')).toBeInTheDocument();
    expect(within(ack).getByText('Respuesta automática')).toBeInTheDocument();
    const claim = within(log)
      .getByText(/Se creó un reclamo/)
      .closest('li') as HTMLElement;
    expect(within(claim).queryByText('Respuesta automática')).not.toBeInTheDocument();
    expect(within(log).getAllByText('Respuesta automática')).toHaveLength(1);
  });
});

describe('Mensajes: esperando a alguien del equipo', () => {
  const since = new Date(Date.now() - 12 * 60_000).toISOString();
  const waiting = inboxConversation({
    id: 'conv-2',
    counterpart: { party: 'customer', displayName: 'Rita Gómez' },
    customer: { id: 'u-rita', displayName: 'Rita Gómez' },
    awaitingHumanSince: since,
  });
  const showWithBridge = (url: string) => {
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

  it('la marca con desde cuándo, en el orden en que la da la API', async () => {
    api.listConversations.mockResolvedValue(list([inboxConversation(), waiting]));
    show();
    const rows = await screen.findAllByRole('link', { name: /Lucía Benítez|Rita Gómez/ });
    expect(within(rows[0]).getByText('Lucía Benítez')).toBeInTheDocument();
    expect(within(rows[0]).queryByText('Esperando a alguien del equipo')).not.toBeInTheDocument();
    expect(within(rows[1]).getByText('Esperando a alguien del equipo')).toBeInTheDocument();
    expect(within(rows[1]).getByText(/hace 12m/)).toHaveAttribute('datetime', since);
  });

  it('el filtro le pide al back sólo las que esperan (`awaiting=true`) y lo dice si no hay', async () => {
    show();
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    const filter = screen.getByRole('button', { name: 'Esperando a alguien del equipo' });
    expect(filter).toHaveAttribute('aria-pressed', 'false');
    expect(api.listConversations).toHaveBeenLastCalledWith(expect.not.objectContaining({ awaiting: true }));
    api.listConversations.mockResolvedValue(list([waiting]));
    fireEvent.click(filter);
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith({
        assigned: 'none',
        status: 'open',
        awaiting: true,
        limit: 50,
        offset: 0,
      }),
    );
    expect(filter).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('link', { name: /Rita Gómez/ })).toBeInTheDocument();
    api.listConversations.mockResolvedValue(list([]));
    fireEvent.click(screen.getByRole('tab', { name: /Todas/ }));
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith({ status: 'open', awaiting: true, limit: 50, offset: 0 }),
    );
    expect(await screen.findByText('Nadie espera a alguien del equipo')).toBeInTheDocument();
  });

  it('en «Mías» y en «Cerradas» no hay filtro ni se pide `awaiting`, aunque venga en la URL', async () => {
    show('/messages?tab=mine&esperando=1');
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    expect(screen.queryByRole('button', { name: 'Esperando a alguien del equipo' })).not.toBeInTheDocument();
    expect(api.listConversations).toHaveBeenLastCalledWith({ assigned: 'me', status: 'open', limit: 50, offset: 0 });
    fireEvent.click(screen.getByRole('tab', { name: /Cerradas/ }));
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith({ status: 'closed', limit: 50, offset: 0 }),
    );
    expect(screen.queryByRole('button', { name: 'Esperando a alguien del equipo' })).not.toBeInTheDocument();
  });

  it('abrir una conversación conserva la pestaña y el filtro, y «volver» también', async () => {
    api.listConversations.mockResolvedValue(list([waiting]));
    api.getConversation.mockResolvedValue(waiting);
    show('/messages?tab=all&esperando=1');
    const row = await screen.findByRole('link', { name: /Rita Gómez/ });
    expect(row).toHaveAttribute('href', '/messages/conv-2?tab=all&esperando=1');
    fireEvent.click(row);
    const back = await screen.findByRole('link', { name: 'Volver a las conversaciones' });
    expect(back).toHaveAttribute('href', '/messages?tab=all&esperando=1');
    expect(screen.getByRole('tab', { name: /Todas/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Esperando a alguien del equipo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('en la conversación abierta, la marca va arriba; al tomarla o escribir, el evento la saca', async () => {
    api.listConversations.mockResolvedValue(list([waiting]));
    api.getConversation.mockResolvedValue(waiting);
    const socket = showWithBridge('/messages/conv-2');
    const header = (await screen.findByRole('heading', { name: /Rita Gómez/ })).closest('header') as HTMLElement;
    expect(await within(header).findByText('Esperando a alguien del equipo')).toBeInTheDocument();
    const row = within(screen.getByRole('list', { name: 'Conversaciones' })).getByRole('link', { name: /Rita Gómez/ });
    expect(within(row).getByText('Esperando a alguien del equipo')).toBeInTheDocument();
    const taken = { ...waiting, awaitingHumanSince: null, assignedTo: { userId: 'u-2', fullName: 'Beto Despacho' } };
    api.listConversations.mockResolvedValue(list([taken]));
    api.getConversation.mockResolvedValue(taken);
    act(() =>
      socket.fire('chat:conversation', {
        conversationId: 'conv-2',
        distributorId: 'd-1',
        change: 'assignment',
        conversation: taken,
      }),
    );
    await waitFor(() => expect(screen.queryByText('Esperando a alguien del equipo', { selector: 'span' })).toBeNull());
    expect(within(header).queryByText('Esperando a alguien del equipo')).not.toBeInTheDocument();
  });

  it('en el hilo, la respuesta del asistente con IA se ve como cualquier respuesta automática: firma y marca, sin el modelo', async () => {
    api.listConversationMessages.mockResolvedValue({
      items: [
        inboxMsg(1, { body: '¿Hasta qué hora toman pedidos?' }),
        inboxMsg(2, {
          party: 'system',
          sender: null,
          kind: 'auto_reply',
          templateKey: 'asistente_ia',
          body: 'Tomamos pedidos hasta las 18.',
          automated: true,
          senderLabel: 'Gasito de Gas Norte',
          payload: { ai: { model: 'claude-haiku-5-5' } },
        }),
      ],
      hasMore: false,
    });
    show('/messages/conv-1');
    const log = await screen.findByRole('log', { name: 'Mensajes' });
    const reply = (await within(log).findByText('Tomamos pedidos hasta las 18.')).closest('li') as HTMLElement;
    expect(within(reply).getByText('Gasito de Gas Norte')).toBeInTheDocument();
    expect(within(reply).getByText('Respuesta automática')).toBeInTheDocument();
    expect(screen.queryByText(/haiku|claude/i)).not.toBeInTheDocument();
  });
});
