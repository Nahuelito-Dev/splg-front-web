import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';
import { inboxConversation, inboxMsg } from '../../test/inboxFixtures';
import type { InboxAccess } from '../../features/chat/useInboxAccess';
import { ApiError } from '../../services/api/errors';
import type { InboxConversation } from '../../services/api/types';

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
  getConversationSuggestions: vi.fn(),
  getInboxSummary: vi.fn(),
  listConversationAssignees: vi.fn(),
}));
const labelsApi = vi.hoisted(() => ({
  listChatLabels: vi.fn(),
  setConversationLabels: vi.fn(),
}));

vi.mock('../../hooks/usePermiso', () => ({ usePermiso: () => ({ allowed: true, known: true }) }));
vi.mock('../../features/chat/useInboxAccess', () => ({ useInboxAccess: () => access.value }));
vi.mock('../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../services/api/chatLabels', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...labelsApi,
}));
vi.mock('../../services/queries/users', () => ({ useMyAccount: () => ({ data: { user_id: 'u-me' } }) }));
vi.mock('../../common/components/useCompanyDisplayName', () => ({ useCompanyDisplayName: () => 'Gas Norte' }));
vi.mock('../../hooks/reduxHooks', () => ({ useAppSelector: () => 'admin@splg.com' }));
vi.mock('../../services/queries/claims', () => ({ useClaim: () => ({ data: undefined, isPending: true }) }));
vi.mock('../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  confirm: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('../../features/chat/inbox/BroadcastDriversModal', () => ({ BroadcastDriversModal: () => null }));

import { useInboxBridge } from '../../features/chat/useInboxBridge';
import { Messages } from './Messages';

const label = (id: string, name: string, color = 'orange') => ({
  id,
  name,
  color,
  createdAt: '2026-11-16T10:00:00.000Z',
  updatedAt: '2026-11-16T10:00:00.000Z',
});
const ENVIO = label('l-1', 'Reclamo de envío', 'red');
const FACTURA = label('l-2', 'Factura', 'blue');
const VIP = label('l-3', 'VIP', 'teal');
const ref = ({ id, name, color }: { id: string; name: string; color: string }) =>
  ({ id, name, color }) as NonNullable<InboxConversation['labels']>[number];
const EXPECTED = {
  enabled: true,
  openNow: true,
  minutes: 15,
  basis: 'history' as const,
  nextOpenAt: null,
  text: 'Solemos responder en ~15 min',
};

const list = (items: InboxConversation[]) => ({
  items,
  total: items.length,
  counts: { unassigned: 1, mine: 0, open: 1 },
});

const SETTINGS = {
  customerChatEnabled: true,
  firstResponseTargetMinutes: 30,
  openNow: true,
  nextOpenAt: null,
};

beforeEach(() => {
  access.value = { customers: true, drivers: true, configure: true, claims: true, any: true };
  [...Object.values(api), ...Object.values(labelsApi)].forEach((fn) => fn.mockReset());
  api.readConversation.mockResolvedValue(undefined);
  api.listCompanyTemplates.mockResolvedValue({ items: [] });
  api.listConversations.mockResolvedValue(list([inboxConversation({ labels: [ref(ENVIO)] })]));
  api.getConversation.mockResolvedValue(inboxConversation({ labels: [ref(ENVIO)], expectedReply: EXPECTED }));
  api.listConversationMessages.mockResolvedValue({ items: [inboxMsg(1)], hasMore: false });
  api.getChatSettings.mockResolvedValue(SETTINGS);
  api.getConversationSuggestions.mockResolvedValue({ basedOnSeq: 1, items: [] });
  api.getInboxSummary.mockResolvedValue({
    unassigned: 1,
    mine: 0,
    awaitingHuman: 0,
    unread: 0,
    attention: 1,
    mentions: 0,
  });
  api.listConversationAssignees.mockResolvedValue({ items: [] });
  labelsApi.listChatLabels.mockResolvedValue({ items: [FACTURA, ENVIO, VIP] });
});
afterEach(cleanup);

const Bridge = () => {
  useInboxBridge(true);
  return null;
};
/** La URL actual, para ver el filtro guardado. */
const Where = () => <output aria-label="URL">{useLocation().search}</output>;

const show = (url = '/messages') => {
  const socket = fakeSocket();
  render(
    <ChatProviders client={newQueryClient()} socket={socket.value} url={url}>
      <Bridge />
      <Where />
      <Routes>
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
      </Routes>
    </ChatProviders>,
  );
  return socket;
};

const detailMeta = async () => {
  const header = (await screen.findByRole('heading', { name: /Lucía Benítez/ })).closest('header') as HTMLElement;
  return header.nextElementSibling as HTMLElement;
};

describe('Bandeja: etiquetas en la lista (7c)', () => {
  it('cada fila lleva sus etiquetas (hasta 3 y «+N» con el resto)', async () => {
    api.listConversations.mockResolvedValue(
      list([
        inboxConversation({
          labels: [ref(FACTURA), ref(ENVIO), ref(VIP), ref(label('l-4', 'Urgente')), ref(label('l-5', 'Zona norte'))],
        }),
      ]),
    );
    show();
    const row = await screen.findByRole('link', { name: /Lucía Benítez/ });
    expect(within(row).getByText('Factura')).toBeInTheDocument();
    expect(within(row).getByText('VIP')).toBeInTheDocument();
    expect(within(row).queryByText('Urgente')).not.toBeInTheDocument();
    expect(within(row).getByText('+2')).toHaveAttribute('title', 'Urgente, Zona norte');
    // Dentro del enlace: sólo contenido en línea, y el nombre dice cuántas, no las lee todas.
    expect(within(row).queryByRole('list')).not.toBeInTheDocument();
    expect(row).toHaveAccessibleName(expect.stringContaining('5 etiquetas'));
    expect(row).not.toHaveAccessibleName(expect.stringContaining('Factura'));
  });

  it('filtra por etiqueta: la pide a la API (`labelId`), la guarda en la URL y el vacío lo dice', async () => {
    show();
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    expect(api.listConversations).toHaveBeenLastCalledWith({ assigned: 'none', status: 'open', limit: 50, offset: 0 });
    api.listConversations.mockResolvedValue(list([]));
    fireEvent.change(await screen.findByLabelText('Etiqueta'), { target: { value: 'l-2' } });
    await waitFor(() =>
      expect(api.listConversations).toHaveBeenLastCalledWith({
        assigned: 'none',
        status: 'open',
        labelId: 'l-2',
        limit: 50,
        offset: 0,
      }),
    );
    expect(screen.getByRole('status', { name: 'URL' })).toHaveTextContent('?etiqueta=l-2');
    expect(await screen.findByText('Sin conversaciones con esa etiqueta')).toBeInTheDocument();
  });

  it('una etiqueta de la URL que ya no existe no filtra y se saca de la URL', async () => {
    show('/messages?etiqueta=l-borrada');
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    await waitFor(() => expect(screen.getByRole('status', { name: 'URL' })).toHaveTextContent(/^$/));
    expect(api.listConversations).not.toHaveBeenCalledWith(expect.objectContaining({ labelId: 'l-borrada' }));
    expect(screen.getByLabelText('Etiqueta')).toHaveValue('');
  });

  it('mientras el catálogo carga, la etiqueta de la URL no se aplica', async () => {
    labelsApi.listChatLabels.mockImplementation(() => new Promise(() => undefined));
    show('/messages?etiqueta=l-2');
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    expect(api.listConversations).not.toHaveBeenCalledWith(expect.objectContaining({ labelId: 'l-2' }));
    expect(screen.getByRole('status', { name: 'URL' })).toHaveTextContent('?etiqueta=l-2');
  });

  it('si el catálogo falla, no filtra y se puede quitar el filtro de la URL', async () => {
    labelsApi.listChatLabels.mockRejectedValue(new ApiError(500, ['Falla']));
    show('/messages?etiqueta=l-2');
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    expect(await screen.findByText(/No se pudieron leer las etiquetas/)).toBeInTheDocument();
    expect(api.listConversations).not.toHaveBeenCalledWith(expect.objectContaining({ labelId: 'l-2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el filtro de etiqueta' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'URL' })).toHaveTextContent(/^$/));
    expect(screen.queryByText(/No se pudieron leer las etiquetas/)).not.toBeInTheDocument();
  });

  it('abrir el filtro vuelve a pedir el catálogo (aparece una etiqueta recién creada)', async () => {
    show();
    const select = await screen.findByLabelText('Etiqueta');
    labelsApi.listChatLabels.mockResolvedValue({ items: [FACTURA, ENVIO, VIP, label('l-9', 'Nueva de otra pestaña')] });
    fireEvent.mouseDown(select);
    expect(await within(select).findByRole('option', { name: 'Nueva de otra pestaña' })).toBeInTheDocument();
  });

  it('sin etiquetas en la empresa no hay filtro', async () => {
    labelsApi.listChatLabels.mockResolvedValue({ items: [] });
    show();
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    await waitFor(() => expect(labelsApi.listChatLabels).toHaveBeenCalled());
    expect(screen.queryByLabelText('Etiqueta')).not.toBeInTheDocument();
  });
});

describe('Bandeja: etiquetas y tiempo esperado en la conversación (7c)', () => {
  it('muestra sus etiquetas y, discreto, el tiempo de respuesta que ve el cliente', async () => {
    show('/messages/conv-1');
    const meta = await detailMeta();
    expect(within(meta).getByText('Reclamo de envío')).toBeInTheDocument();
    expect(within(meta).getByText('El cliente ve: «Solemos responder en ~15 min»')).toBeInTheDocument();
  });

  it('con el tiempo esperado apagado no lo muestra', async () => {
    api.getConversation.mockResolvedValue(
      inboxConversation({ expectedReply: { ...EXPECTED, enabled: false, minutes: null, basis: null, text: null } }),
    );
    show('/messages/conv-1');
    const meta = await detailMeta();
    expect(within(meta).getByRole('button', { name: 'Poner etiquetas' })).toBeInTheDocument();
    expect(within(meta).queryByText(/ve: «/)).not.toBeInTheDocument();
  });

  it('pone y saca etiquetas (la API reemplaza la lista) y la ficha queda con lo que devuelve', async () => {
    labelsApi.setConversationLabels.mockResolvedValue(inboxConversation({ labels: [ref(FACTURA)] }));
    show('/messages/conv-1');
    fireEvent.click(within(await detailMeta()).getByRole('button', { name: 'Cambiar las etiquetas' }));
    const dialog = await screen.findByRole('dialog', { name: 'Etiquetas de la conversación' });
    expect(await within(dialog).findByRole('checkbox', { name: 'Reclamo de envío' })).toBeChecked();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Reclamo de envío' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Factura' }));
    // La ficha que queda es la que devolvió el PUT (la relectura de la bandeja falla y no la pisa).
    api.getConversation.mockRejectedValue(new ApiError(503, ['Sin conexión']));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(labelsApi.setConversationLabels).toHaveBeenCalledWith('conv-1', ['l-2']));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const meta = await detailMeta();
    await waitFor(() => expect(within(meta).getByText('Factura')).toBeInTheDocument());
    expect(within(meta).queryByText('Reclamo de envío')).not.toBeInTheDocument();
    expect(within(meta).getByText(/Solemos responder en ~15 min/)).toBeInTheDocument();
  });

  it('lo marcado no se pierde si la ficha se relee con el editor abierto; al abrir pide el catálogo de nuevo', async () => {
    const socket = show('/messages/conv-1');
    const meta = await detailMeta();
    await waitFor(() => expect(labelsApi.listChatLabels).toHaveBeenCalledTimes(1));
    fireEvent.click(within(meta).getByRole('button', { name: 'Cambiar las etiquetas' }));
    const dialog = await screen.findByRole('dialog', { name: 'Etiquetas de la conversación' });
    await waitFor(() => expect(labelsApi.listChatLabels).toHaveBeenCalledTimes(2));
    fireEvent.click(await within(dialog).findByRole('checkbox', { name: 'VIP' }));
    // Llega un cambio de la conversación (otra referencia, mismas etiquetas): la ficha se reemplaza.
    act(() =>
      socket.fire('chat:conversation', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        change: 'assignment',
        conversation: inboxConversation({ labels: [ref(ENVIO)], assignedTo: { userId: 'u-2', fullName: 'Beto' } }),
      }),
    );
    await screen.findByText(/Atiende Beto/);
    expect(within(dialog).getByRole('checkbox', { name: 'VIP' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Reclamo de envío' })).toBeChecked();
  });

  it('con 5 puestas no deja marcar otra; un error de la API se muestra en el editor', async () => {
    const five = [FACTURA, ENVIO, VIP, label('l-4', 'Urgente'), label('l-5', 'Zona norte')];
    labelsApi.listChatLabels.mockResolvedValue({ items: [...five, label('l-6', 'Sexta')] });
    api.getConversation.mockResolvedValue(inboxConversation({ labels: five.map(ref) }));
    labelsApi.setConversationLabels.mockRejectedValue(new ApiError(404, ['La etiqueta no existe o se dio de baja']));
    show('/messages/conv-1');
    fireEvent.click(within(await detailMeta()).getByRole('button', { name: 'Cambiar las etiquetas' }));
    const dialog = await screen.findByRole('dialog', { name: 'Etiquetas de la conversación' });
    expect(await within(dialog).findByRole('checkbox', { name: 'Sexta' })).toBeDisabled();
    expect(within(dialog).getByText(/5 de 5/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'VIP' }));
    expect(within(dialog).getByRole('checkbox', { name: 'Sexta' })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('La etiqueta no existe o se dio de baja')).toHaveAttribute('role', 'alert');
  });

  it('sin etiquetas en la empresa, el editor manda a la configuración (sólo a quien configura)', async () => {
    labelsApi.listChatLabels.mockResolvedValue({ items: [] });
    api.getConversation.mockResolvedValue(inboxConversation());
    show('/messages/conv-1');
    fireEvent.click(within(await detailMeta()).getByRole('button', { name: 'Poner etiquetas' }));
    const dialog = await screen.findByRole('dialog', { name: 'Etiquetas de la conversación' });
    expect(await within(dialog).findByText('La empresa no tiene etiquetas')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Ir a la configuración' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('sin el permiso del canal de la conversación, las ve pero no las cambia', async () => {
    access.value = { customers: false, drivers: true, configure: false, claims: false, any: true };
    show('/messages/conv-1');
    const meta = await detailMeta();
    expect(within(meta).getByText('Reclamo de envío')).toBeInTheDocument();
    expect(within(meta).queryByRole('button', { name: /etiquetas/i })).not.toBeInTheDocument();
  });

  it('por el socket (`change: labels`) la ficha y la lista se ponen al día sin recargar', async () => {
    const socket = show('/messages/conv-1');
    const meta = await detailMeta();
    expect(within(meta).getByText('Reclamo de envío')).toBeInTheDocument();
    const relabeled = inboxConversation({ labels: [ref(VIP)] });
    api.listConversations.mockResolvedValue(list([relabeled]));
    api.getConversation.mockResolvedValue({ ...relabeled, expectedReply: EXPECTED });
    const catalogCalls = labelsApi.listChatLabels.mock.calls.length;
    act(() =>
      socket.fire('chat:conversation', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        change: 'labels',
        conversation: relabeled,
      }),
    );
    expect(within(await detailMeta()).getByText('VIP')).toBeInTheDocument();
    expect(within(await detailMeta()).queryByText('Reclamo de envío')).not.toBeInTheDocument();
    expect(within(await detailMeta()).getByText(/Solemos responder/)).toBeInTheDocument();
    const row = within(screen.getByRole('list', { name: 'Conversaciones' })).getByRole('link', { name: /Lucía/ });
    await waitFor(() => expect(within(row).getByText('VIP')).toBeInTheDocument());
    await waitFor(() => expect(labelsApi.listChatLabels.mock.calls.length).toBeGreaterThan(catalogCalls));
  });

  it('`chat:inbox` con `change: labels` relee la lista', async () => {
    const socket = show();
    await screen.findByRole('link', { name: /Lucía Benítez/ });
    api.listConversations.mockResolvedValue(list([inboxConversation({ labels: [ref(FACTURA)] })]));
    act(() =>
      socket.fire('chat:inbox', {
        conversationId: 'conv-1',
        distributorId: 'd-1',
        channel: 'staff_customer',
        status: 'open',
        change: 'labels',
        assignedToUserId: null,
        lastMessage: null,
        labels: [ref(FACTURA)],
      }),
    );
    const row = await screen.findByRole('link', { name: /Lucía Benítez/ });
    await waitFor(() => expect(within(row).getByText('Factura')).toBeInTheDocument());
  });
});

describe('Bandeja: el cierre por inactividad en el hilo (7c)', () => {
  it('el aviso y el cierre se ven como avisos del sistema, y el motivo en castellano', async () => {
    api.getConversation.mockResolvedValue(inboxConversation({ status: 'closed', closedReason: 'inactivity' }));
    api.listConversationMessages.mockResolvedValue({
      items: [
        inboxMsg(1),
        inboxMsg(2, {
          party: 'system',
          sender: null,
          kind: 'system',
          systemCode: 'inactivity_warning',
          body: 'Si no tenés más consultas, cerramos la conversación en 15 min.',
          payload: { minutes: 15, closesAt: '2026-11-15T14:00:00.000Z' },
        }),
        inboxMsg(3, { party: 'system', sender: null, kind: 'system', systemCode: 'closed_inactivity', body: null }),
      ],
      hasMore: false,
    });
    show('/messages/conv-1');
    const log = await screen.findByRole('log', { name: 'Mensajes' });
    expect(
      await within(log).findByText('Se avisó que la conversación se cierra en 15 min si no hay respuesta'),
    ).toBeInTheDocument();
    expect(
      within(log).getByText('Se cerró sola por inactividad: no hubo respuesta en el plazo de la configuración'),
    ).toBeInTheDocument();
    expect(within(log).queryByText('Equipo')).not.toBeInTheDocument();
    const header = (await screen.findByRole('heading', { name: /Lucía Benítez/ })).closest('header') as HTMLElement;
    expect(within(header).getByText(/Cerrada por inactividad/)).toBeInTheDocument();
  });
});
