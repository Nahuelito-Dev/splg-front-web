import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../../test/chatFixtures';
import { inboxConversation, inboxMsg } from '../../../test/inboxFixtures';
import type { InboxAccess } from '../useInboxAccess';
import type {
  Broadcast,
  BroadcastDriversBody,
  OpenConversation,
  OpenStaffConversationBody,
} from '../../../services/api/types';

const access = vi.hoisted(() => ({
  value: { customers: true, drivers: true, configure: false, claims: false, any: true } as InboxAccess,
}));
const api = vi.hoisted(() => ({
  openConversation: vi.fn<[OpenStaffConversationBody], Promise<OpenConversation>>(),
  broadcastDrivers: vi.fn<[BroadcastDriversBody], Promise<Broadcast>>(),
}));

vi.mock('../useInboxAccess', () => ({ useInboxAccess: () => access.value }));
vi.mock('../../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../../services/queries/deliveries', () => ({
  useDeliveryOptions: () => ({
    data: {
      rows: [
        { user_id: 'u-d1', isEnabled: true, deletedAt: null, user: { full_name: 'Diego Ferreyra', blocked: false } },
        { user_id: 'u-d2', isEnabled: true, deletedAt: null, user: { full_name: 'Marta Ríos', blocked: false } },
        { user_id: 'u-d3', isEnabled: false, deletedAt: null, user: { full_name: 'Deshabilitado', blocked: false } },
      ],
      total: 3,
    },
    isPending: false,
  }),
}));
vi.mock('../../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { BroadcastDriversModal } from './BroadcastDriversModal';
import { MessageButton, type MessageTarget } from './MessageButton';

beforeEach(() => {
  access.value = { customers: true, drivers: true, configure: false, claims: false, any: true };
  api.openConversation.mockReset();
  api.broadcastDrivers.mockReset();
});
afterEach(cleanup);

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const showButton = (target: MessageTarget) =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url="/ficha">
      <Routes>
        <Route path="/ficha" element={<MessageButton target={target} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </ChatProviders>,
  );

const CUSTOMER: MessageTarget = { kind: 'customer', userId: 'u-cli', name: 'Lucía Benítez' };
const ORDER: MessageTarget = {
  kind: 'order',
  orderId: 'o-1',
  label: 'pedido #A1B2C3',
  customerName: 'Lucía Benítez',
  driverName: 'Diego Ferreyra',
};

describe('«Mensaje» en las fichas', () => {
  it('cliente: abre la conversación general con el primer mensaje y lleva a la bandeja', async () => {
    api.openConversation.mockResolvedValue({ conversation: inboxConversation({ id: 'conv-9' }), message: inboxMsg(1) });
    showButton(CUSTOMER);
    fireEvent.click(screen.getByRole('button', { name: 'Mensaje' }));
    const dialog = await screen.findByRole('dialog', { name: 'Mensaje a Lucía Benítez' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    expect(await within(dialog).findByText('Escribí el mensaje')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Mensaje/), { target: { value: '  Hola Lucía  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(api.openConversation).toHaveBeenCalledTimes(1));
    expect(api.openConversation.mock.calls[0][0]).toMatchObject({
      channel: 'staff_customer',
      subjectType: 'general',
      customerId: 'u-cli',
      firstMessage: { body: 'Hola Lucía' },
    });
    expect(api.openConversation.mock.calls[0][0].firstMessage.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByTestId('where')).toHaveTextContent('/messages/conv-9');
  });

  it('pedido: se elige cliente o chofer y va por el pedido', async () => {
    api.openConversation.mockResolvedValue({ conversation: inboxConversation(), message: inboxMsg(1) });
    showButton(ORDER);
    fireEvent.click(screen.getByRole('button', { name: 'Mensaje' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chofer: Diego Ferreyra/ }));
    fireEvent.change(within(dialog).getByLabelText(/Mensaje/), { target: { value: 'El cliente no está' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    await waitFor(() =>
      expect(api.openConversation.mock.calls[0][0]).toMatchObject({
        channel: 'staff_driver',
        subjectType: 'order',
        orderId: 'o-1',
      }),
    );
  });

  it('el mismo texto reintentado reusa el id; otro texto, otro id', async () => {
    api.openConversation.mockRejectedValue(new Error('sin red'));
    showButton(CUSTOMER);
    fireEvent.click(screen.getByRole('button', { name: 'Mensaje' }));
    const dialog = await screen.findByRole('dialog');
    const send = async (text: string, times: number) => {
      fireEvent.change(within(dialog).getByLabelText(/Mensaje/), { target: { value: text } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
      await waitFor(() => expect(api.openConversation).toHaveBeenCalledTimes(times));
    };
    await send('hola', 1);
    await send('hola', 2);
    await send('hola, ¿cómo va?', 3);
    const ids = api.openConversation.mock.calls.map(([body]) => body.firstMessage.clientMessageId);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it('un 409 de la API (pedido viejo, sin chofer) se muestra y no navega', async () => {
    const { notify } = await import('../../../utils/notifications');
    api.openConversation.mockRejectedValue(new Error('Pasaron 30 días desde que el pedido se entregó'));
    showButton(ORDER);
    fireEvent.click(screen.getByRole('button', { name: 'Mensaje' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Mensaje/), { target: { value: 'hola' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('sin el canal no aparece: sólo choferes no ve «Mensaje» en la ficha del cliente', () => {
    access.value = { customers: false, drivers: true, configure: false, claims: false, any: true };
    showButton(CUSTOMER);
    expect(screen.queryByRole('button', { name: 'Mensaje' })).not.toBeInTheDocument();
    cleanup();
    showButton({ kind: 'driver', userId: 'u-d1', name: 'Diego' });
    expect(screen.getByRole('button', { name: 'Mensaje' })).toBeInTheDocument();
  });

  it('en un pedido sin chofer, quien sólo atiende choferes no tiene a quién escribirle', () => {
    access.value = { customers: false, drivers: true, configure: false, claims: false, any: true };
    showButton({ ...ORDER, driverName: null });
    expect(screen.queryByRole('button', { name: 'Mensaje' })).not.toBeInTheDocument();
  });
});

describe('«Avisar a varios choferes»', () => {
  const show = () =>
    render(
      <ChatProviders client={newQueryClient()} socket={fakeSocket().value}>
        <BroadcastDriversModal open onClose={vi.fn()} />
      </ChatProviders>,
    );

  it('lista sólo los habilitados, valida y manda un lote con su id', async () => {
    api.broadcastDrivers.mockResolvedValue({ sent: 2, conversationIds: ['c-1', 'c-2'] });
    show();
    const dialog = screen.getByRole('dialog', { name: 'Avisar a varios choferes' });
    expect(within(dialog).queryByText('Deshabilitado')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Enviar a 0 choferes/ }));
    expect(await within(dialog).findByText('Elegí al menos un chofer')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Elegir todos los que se ven'));
    fireEvent.change(within(dialog).getByLabelText(/Aviso/), { target: { value: 'Hoy cerramos a las 18' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Enviar a 2 choferes/ }));
    await waitFor(() => expect(api.broadcastDrivers).toHaveBeenCalledTimes(1));
    const body = api.broadcastDrivers.mock.calls[0][0];
    expect(body).toMatchObject({ driverIds: ['u-d1', 'u-d2'], body: 'Hoy cerramos a las 18' });
    expect(body.clientBatchId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('si cambian los destinatarios o el texto, es otro envío: otro lote', async () => {
    api.broadcastDrivers.mockRejectedValue(new Error('sin red'));
    show();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText('Diego Ferreyra'));
    fireEvent.change(within(dialog).getByLabelText(/Aviso/), { target: { value: 'hola' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Enviar a 1 chofer/ }));
    await waitFor(() => expect(api.broadcastDrivers).toHaveBeenCalledTimes(1));
    fireEvent.click(within(dialog).getByLabelText('Marta Ríos'));
    fireEvent.click(within(dialog).getByRole('button', { name: /Enviar a 2 choferes/ }));
    await waitFor(() => expect(api.broadcastDrivers).toHaveBeenCalledTimes(2));
    fireEvent.change(within(dialog).getByLabelText(/Aviso/), { target: { value: 'chau' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Enviar a 2 choferes/ }));
    await waitFor(() => expect(api.broadcastDrivers).toHaveBeenCalledTimes(3));
    const ids = api.broadcastDrivers.mock.calls.map(([body]) => body.clientBatchId);
    expect(new Set(ids).size).toBe(3);
  });

  it('reintentar después de un error usa el mismo lote (no duplica)', async () => {
    api.broadcastDrivers
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce({ sent: 1, conversationIds: ['c'] });
    show();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText('Diego Ferreyra'));
    fireEvent.change(within(dialog).getByLabelText(/Aviso/), { target: { value: 'hola' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Enviar a 1 chofer/ }));
    await waitFor(() => expect(api.broadcastDrivers).toHaveBeenCalledTimes(1));
    fireEvent.click(within(dialog).getByRole('button', { name: /Enviar a 1 chofer/ }));
    await waitFor(() => expect(api.broadcastDrivers).toHaveBeenCalledTimes(2));
    expect(api.broadcastDrivers.mock.calls[1][0].clientBatchId).toBe(
      api.broadcastDrivers.mock.calls[0][0].clientBatchId,
    );
  });
});
