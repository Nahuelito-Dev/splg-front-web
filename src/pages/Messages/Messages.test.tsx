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
vi.mock('../../services/queries/admins', () => ({
  useAdmins: () => ({
    data: [
      { user_id: 'u-me', user: { full_name: 'Ana Operadora', blocked: false, deletedAt: null } },
      { user_id: 'u-2', user: { full_name: 'Beto Despacho', blocked: false, deletedAt: null } },
    ],
    isPending: false,
  }),
}));
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

import { inboxKeys } from '../../services/queries/inbox';
import { Messages } from './Messages';

const list = (items: InboxConversation[], counts = { unassigned: 2, mine: 1, open: 5 }) => ({
  items,
  total: items.length,
  counts,
});

const SETTINGS = {
  customerChatEnabled: true,
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
    fireEvent.change(within(dialog).getByLabelText('Atiende'), { target: { value: 'u-2' } });
    await act(async () => {
      client.setQueryData(inboxKeys.detail('conv-1'), inboxConversation({ unreadCount: 3 }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(within(dialog).getByLabelText('Atiende')).toHaveValue('u-2');
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
    fireEvent.change(within(dialog).getByLabelText('Atiende'), { target: { value: 'u-2' } });
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
