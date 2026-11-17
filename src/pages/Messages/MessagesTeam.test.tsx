import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';
import { ApiError } from '../../services/api/errors';
import type { ChatAgent } from '../../services/api/types';

const state = vi.hoisted(() => ({
  denied: new Set<string>(),
  canWrite: true,
  inbox: true,
}));
const api = vi.hoisted(() => ({
  listChatAgents: vi.fn(),
  updateChatAgent: vi.fn(),
  getMyChatStatus: vi.fn(),
}));
const inboxApi = vi.hoisted(() => ({ getChatSettings: vi.fn() }));
const notifyMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../hooks/usePermiso', () => ({
  usePermiso: (code: string) => ({ allowed: !state.denied.has(code), known: true }),
}));
vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({ canWrite: state.canWrite, mode: state.canWrite ? 'company' : 'support' }),
}));
vi.mock('../../features/chat/useInboxAccess', () => ({
  useInboxAccess: () => ({
    customers: state.inbox,
    drivers: state.inbox,
    configure: !state.denied.has('mensajes.configurar'),
    claims: false,
    any: state.inbox,
  }),
}));
vi.mock('../../services/api/chatAssignment', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...inboxApi,
}));
vi.mock('../../services/queries/users', () => ({ useMyAccount: () => ({ data: { user_id: 'u-me' } }) }));
vi.mock('../../hooks/reduxHooks', () => ({ useAppSelector: () => 'admin@splg.com' }));
vi.mock('../../utils/notifications', () => ({ notify: notifyMock, confirm: vi.fn(() => Promise.resolve(true)) }));

import { MessagesTeam } from './MessagesTeam';

const agent = (over: Partial<ChatAgent> = {}): ChatAgent => ({
  userId: 'u-ana',
  name: 'Ana Pérez',
  status: 'online',
  connected: true,
  available: true,
  maxOpen: 5,
  maxOpenOverride: null,
  openAssigned: 2,
  channels: ['staff_customer', 'staff_driver'],
  lastAssignedAt: null,
  ...over,
});

const TEAM = [
  agent(),
  agent({
    userId: 'u-beto',
    name: 'Beto Gómez',
    status: 'away',
    available: false,
    channels: ['staff_driver'],
    maxOpen: 8,
    maxOpenOverride: 8,
    openAssigned: 1,
  }),
  agent({ userId: 'u-caro', name: 'Caro Díaz', connected: false, available: false, openAssigned: 0 }),
];

beforeEach(() => {
  state.denied = new Set();
  state.canWrite = true;
  state.inbox = true;
  Object.values(api).forEach((fn) => fn.mockReset());
  inboxApi.getChatSettings.mockReset();
  Object.values(notifyMock).forEach((fn) => fn.mockClear());
  api.listChatAgents.mockResolvedValue({ items: TEAM });
  inboxApi.getChatSettings.mockResolvedValue({ openNow: true, autoAssignEnabled: true, autoAssignMaxOpen: 5 });
});
afterEach(cleanup);

const show = () => {
  const socket = fakeSocket();
  render(
    <ChatProviders client={newQueryClient()} socket={socket.value} url="/messages/team">
      <MessagesTeam />
    </ChatProviders>,
  );
  return socket;
};

const card = async (name: string) => (await screen.findByText(name)).closest('li') as HTMLElement;

describe('Equipo de mensajes', () => {
  it('cada persona con sus canales, su estado, abiertas sobre el tope y de dónde sale el tope', async () => {
    show();
    const ana = await card('Ana Pérez');
    expect(within(ana).getByText('Clientes y choferes')).toBeInTheDocument();
    expect(within(ana).getByText('En línea')).toBeInTheDocument();
    expect(within(ana).getByText('2 de 5')).toBeInTheDocument();
    expect(within(ana).getByText(/tope de la empresa/)).toBeInTheDocument();
    expect(within(ana).getByText('Última asignación: Todavía no')).toBeInTheDocument();
    const beto = await card('Beto Gómez');
    expect(within(beto).getByText('Choferes')).toBeInTheDocument();
    expect(within(beto).getByText('Ausente')).toBeInTheDocument();
    expect(within(beto).getByText(/tope propio/)).toBeInTheDocument();
    expect(within(await card('Caro Díaz')).getByText('Desconectada')).toBeInTheDocument();
    expect(screen.getByText('1 de 3 en línea')).toBeInTheDocument();
  });

  it('en línea con el panel abierto pero la empresa cerrada: «Fuera de horario»', async () => {
    inboxApi.getChatSettings.mockResolvedValue({ openNow: false, autoAssignEnabled: true, autoAssignMaxOpen: 5 });
    api.listChatAgents.mockResolvedValue({ items: [agent({ available: false })] });
    show();
    expect(within(await card('Ana Pérez')).getByText('Fuera de horario')).toBeInTheDocument();
  });

  it('con la asignación apagada, lo avisa', async () => {
    inboxApi.getChatSettings.mockResolvedValue({ openNow: true, autoAssignEnabled: false, autoAssignMaxOpen: 5 });
    show();
    expect(await screen.findByText(/La asignación automática está apagada/)).toBeInTheDocument();
  });

  it('`chat:team` mueve la fila; alguien que no estaba relee la lista', async () => {
    const socket = show();
    const ana = await card('Ana Pérez');
    act(() =>
      socket.fire('chat:team', { userId: 'u-ana', status: 'away', connected: true, available: false, openAssigned: 4 }),
    );
    expect(await within(ana).findByText('Ausente')).toBeInTheDocument();
    expect(within(ana).getByText('4 de 5')).toBeInTheDocument();
    expect(api.listChatAgents).toHaveBeenCalledTimes(1);
    act(() =>
      socket.fire('chat:team', {
        userId: 'u-nuevo',
        status: 'online',
        connected: true,
        available: true,
        openAssigned: 0,
      }),
    );
    await waitFor(() => expect(api.listChatAgents).toHaveBeenCalledTimes(2));
  });

  it('quien configura cambia el tope a uno propio', async () => {
    api.updateChatAgent.mockResolvedValue(agent({ maxOpen: 3, maxOpenOverride: 3 }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar el tope de Ana Pérez' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tope de Ana Pérez' });
    fireEvent.change(within(dialog).getByLabelText('Tope'), { target: { value: 'own' } });
    const input = await within(dialog).findByLabelText('Conversaciones abiertas');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateChatAgent).toHaveBeenCalledWith('u-ana', { maxOpenOverride: 3 }));
    expect(await within(await card('Ana Pérez')).findByText('2 de 3')).toBeInTheDocument();
    expect(notifyMock.success).toHaveBeenCalledWith('Tope de Ana Pérez guardado');
  });

  it('volver al de la empresa manda `null`', async () => {
    api.updateChatAgent.mockResolvedValue(agent({ userId: 'u-beto', name: 'Beto Gómez', maxOpenOverride: null }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar el tope de Beto Gómez' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tope de Beto Gómez' });
    expect(within(dialog).getByLabelText('Conversaciones abiertas')).toHaveValue(8);
    fireEvent.change(within(dialog).getByLabelText('Tope'), { target: { value: 'company' } });
    expect(within(dialog).getByRole('option', { name: 'El de la empresa (5)' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateChatAgent).toHaveBeenCalledWith('u-beto', { maxOpenOverride: null }));
  });

  it('un tope fuera de 1 a 50 no se manda', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar el tope de Beto Gómez' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tope de Beto Gómez' });
    fireEvent.change(within(dialog).getByLabelText('Conversaciones abiertas'), { target: { value: '51' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(
      await within(dialog).findByText('El tope de conversaciones abiertas por persona va de 1 a 50'),
    ).toBeInTheDocument();
    expect(api.updateChatAgent).not.toHaveBeenCalled();
  });

  it('el 400 de la API va junto al campo; un 404 al pie', async () => {
    const http = (status: number, message: string) => new ApiError(status, [message]);
    api.updateChatAgent.mockRejectedValueOnce(
      http(400, 'Tope propio de conversaciones abiertas: tiene que ser un número entero'),
    );
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar el tope de Beto Gómez' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tope de Beto Gómez' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    const input = within(dialog).getByLabelText('Conversaciones abiertas');
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(
      within(dialog).getByText('Tope propio de conversaciones abiertas: tiene que ser un número entero'),
    ).toBeInTheDocument();
    api.updateChatAgent.mockRejectedValueOnce(http(404, 'No es del equipo de la bandeja'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('No es del equipo de la bandeja')).toHaveAttribute('role', 'alert');
  });

  it('quien sólo supervisa ve el equipo sin editar', async () => {
    state.denied = new Set(['mensajes.configurar']);
    show();
    await card('Ana Pérez');
    expect(screen.queryByRole('button', { name: /Editar el tope/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Configuración' })).not.toBeInTheDocument();
  });

  it('quien sólo supervisa (sin canal ni configurar) no pide el horario: sin `openNow` no dice «Fuera de horario»', async () => {
    state.denied = new Set(['mensajes.clientes', 'mensajes.choferes', 'mensajes.configurar']);
    state.inbox = false;
    inboxApi.getChatSettings.mockResolvedValue({ openNow: false, autoAssignEnabled: false, autoAssignMaxOpen: 5 });
    api.listChatAgents.mockResolvedValue({ items: [agent({ available: false }), TEAM[2]] });
    show();
    expect(within(await card('Ana Pérez')).getByText('Desconectada')).toBeInTheDocument();
    expect(within(await card('Caro Díaz')).getByText('Desconectada')).toBeInTheDocument();
    expect(screen.queryByText('Fuera de horario')).not.toBeInTheDocument();
    expect(screen.queryByText(/La asignación automática está apagada/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar el tope/ })).not.toBeInTheDocument();
    expect(inboxApi.getChatSettings).not.toHaveBeenCalled();
  });

  it('modo soporte: sólo lectura', async () => {
    state.canWrite = false;
    show();
    await card('Ana Pérez');
    expect(screen.queryByRole('button', { name: /Editar el tope/ })).not.toBeInTheDocument();
  });

  it('sin supervisar ni configurar: no se pide nada', async () => {
    state.denied = new Set(['mensajes.supervisar', 'mensajes.configurar']);
    show();
    expect(await screen.findByText('No tenés permiso para ver el equipo de mensajes')).toBeInTheDocument();
    expect(api.listChatAgents).not.toHaveBeenCalled();
  });

  it('sin nadie en el equipo, el vacío; si falla, el error con reintentar', async () => {
    api.listChatAgents.mockResolvedValueOnce({ items: [] });
    show();
    expect(await screen.findByText('Nadie atiende los mensajes todavía')).toBeInTheDocument();
    cleanup();
    api.listChatAgents.mockRejectedValueOnce(new Error('boom'));
    show();
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
