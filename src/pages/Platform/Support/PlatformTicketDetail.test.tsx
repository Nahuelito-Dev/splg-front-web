import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, msg, newQueryClient, ticket } from '../../../test/chatFixtures';
import type { Ticket } from '../../../services/api/types';

const api = vi.hoisted(() => ({
  getPlatformTicket: vi.fn(),
  listPlatformTicketMessages: vi.fn(),
  sendPlatformTicketMessage: vi.fn(),
  readPlatformTicket: vi.fn(() => Promise.resolve()),
  listQuickReplies: vi.fn(() => Promise.resolve({ items: [] })),
  updatePlatformTicket: vi.fn(),
  assignPlatformTicket: vi.fn(),
}));
vi.mock('../../../services/api/supportChat', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../../services/queries/supportSessions', () => ({
  usePlatform: () => ({ data: { name: 'OrixTech' } }),
  useRequestSupportSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../../../services/queries/distributors', () => ({
  useDistributors: () => ({ data: [{ distributor_id: 'd-1', name: 'Gas Norte', status: 'active' }], isPending: false }),
}));
vi.mock('../../../services/queries/users', () => ({ useMyAccount: () => ({ data: { user_id: 'u-me' } }) }));
vi.mock('../../../hooks/reduxHooks', () => ({
  useAppSelector: (fn: (s: unknown) => unknown) => fn({ auth: { email: 'sa@splg.com' } }),
}));

vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { PlatformTicketDetail } from './PlatformTicketDetail';

afterEach(cleanup);

const show = (t: Ticket) => {
  api.getPlatformTicket.mockResolvedValue(t);
  api.listPlatformTicketMessages.mockResolvedValue({
    items: [
      msg(1, { conversationId: 'c-t1', party: 'company', body: 'No anda el push' }),
      msg(2, {
        conversationId: 'c-t1',
        isMine: true,
        visibility: 'internal',
        body: 'Revisar el token de FCM',
        sender: { displayName: 'Lucía Pérez' },
      }),
    ],
    hasMore: false,
  });
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url="/platform/tickets/t-1">
      <Routes>
        <Route path="/platform/tickets/:id" element={<PlatformTicketDetail />} />
      </Routes>
    </ChatProviders>,
  );
};

describe('PlatformTicketDetail: la ficha del ticket del lado de la plataforma', () => {
  it('las notas internas se ven, con su marca', async () => {
    show(ticket({ status: 'open' }));
    expect(await screen.findByText('Revisar el token de FCM')).toBeInTheDocument();
    expect(screen.getByText('Nota interna · Lucía Pérez')).toBeInTheDocument();
  });

  it('abierto: «Responder / Nota interna» en el compositor', async () => {
    show(ticket({ status: 'open' }));
    await screen.findByText('No anda el push');
    expect(screen.getByRole('button', { name: 'Nota interna' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument();
  });

  it('cerrado: el historial completo, con las notas, sin compositor ni gestión', async () => {
    show(ticket({ status: 'closed', closedAt: '2026-11-14T18:00:00.000Z' }));
    expect(await screen.findByText('Revisar el token de FCM')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument();
    expect(screen.getByText('El ticket está cerrado: queda para consultar.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Cambiar el estado' })).not.toBeInTheDocument();
  });

  it('los estados que ofrece siguen la máquina del ticket', async () => {
    show(ticket({ status: 'waiting_company' }));
    const group = await screen.findByRole('group', { name: 'Cambiar el estado' });
    expect(group).toHaveTextContent('Pasar a en curso');
    expect(group).toHaveTextContent('Resolver');
    // Cerrar no: lo cierra la empresa al confirmar o el cierre automático.
    expect(group).not.toHaveTextContent('Cerrar');
  });

  it('«Asignármelo» asigna a quien mira', async () => {
    api.assignPlatformTicket.mockResolvedValue(ticket({ assignedTo: { userId: 'u-me', fullName: 'Yo' } }));
    show(ticket({ status: 'new' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Asignármelo' }));
    await waitFor(() => expect(api.assignPlatformTicket).toHaveBeenCalledWith('t-1', 'u-me'));
  });

  it('«Pedir sesión» precarga el número del ticket como referencia', async () => {
    show(ticket({ status: 'open', number: 'T-000042' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pedir sesión' }));
    expect(await screen.findByLabelText('Referencia (opcional)')).toHaveValue('T-000042');
  });
});
