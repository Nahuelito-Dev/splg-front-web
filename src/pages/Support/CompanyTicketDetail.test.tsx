import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, msg, newQueryClient, ticket } from '../../test/chatFixtures';
import type { Ticket } from '../../services/api/types';

const api = vi.hoisted(() => ({
  getCompanyTicket: vi.fn(),
  listCompanyTicketMessages: vi.fn(),
  sendCompanyTicketMessage: vi.fn(),
  readCompanyTicket: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../services/api/supportChat', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
const perms = vi.hoisted(() => ({ canManage: true }));
vi.mock('../../common/support/useSupportAccessActions', () => ({
  useSupportAccessPermissions: () => ({ canView: true, canManage: perms.canManage, isPending: false }),
}));
vi.mock('../../services/queries/supportSessions', () => ({
  usePlatform: () => ({ data: { name: 'OrixTech' } }),
  useSupportAccess: () => ({ data: undefined, error: null }),
}));

import { CompanyTicketDetail } from './CompanyTicketDetail';

afterEach(cleanup);
beforeEach(() => {
  perms.canManage = true;
  api.listCompanyTicketMessages.mockReset();
});

const statusChange = (seq: number, from: string, to: string) =>
  msg(seq, {
    conversationId: 'c-t1',
    kind: 'system',
    party: 'system',
    systemCode: 'ticket_status_changed',
    payload: { ticketId: 't-1', number: 'T-000001', from, to },
  });

const show = (t: Ticket) => {
  api.getCompanyTicket.mockResolvedValue(t);
  api.listCompanyTicketMessages.mockResolvedValue({
    items: [
      msg(1, { conversationId: 'c-t1', body: 'La factura salió dos veces' }),
      statusChange(2, 'open', 'resolved'),
    ],
    hasMore: false,
  });
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url="/support/tickets/t-1">
      <Routes>
        <Route path="/support/tickets/:id" element={<CompanyTicketDetail />} />
      </Routes>
    </ChatProviders>,
  );
};

describe('CompanyTicketDetail: la ficha del ticket de la empresa', () => {
  it('cerrado: el hilo completo en sólo lectura, sin compositor, y el aviso para abrir otro', async () => {
    show(ticket({ status: 'closed', closedAt: '2026-11-14T18:00:00.000Z', satisfaction: 4 }));
    expect(await screen.findByText('La factura salió dos veces')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument();
    expect(screen.getByText(/El ticket está cerrado/)).toBeInTheDocument();
    expect(screen.getByText('4 de 5')).toBeInTheDocument();
    expect(screen.getByText('T-000001')).toBeInTheDocument();
  });

  it('la línea de tiempo muestra los cambios de estado', async () => {
    show(ticket({ status: 'closed', closedAt: '2026-11-14T18:00:00.000Z' }));
    const timeline = await screen.findByRole('list', { name: 'Línea de tiempo del ticket' });
    expect(within(timeline).getByText('Lo abrió la empresa')).toBeInTheDocument();
    expect(within(timeline).getByText('En curso → Resuelto')).toBeInTheDocument();
    expect(within(timeline).getByText('Cerrado')).toBeInTheDocument();
  });

  it('resuelto: sólo lectura hasta que se elige «Responder y reabrir», y se puede confirmar', async () => {
    show(ticket({ status: 'resolved', resolvedAt: '2026-11-14T17:00:00.000Z' }));
    await screen.findByText('La factura salió dos veces');
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar y cerrar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Responder y reabrir' }));
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument();
  });

  it('abierto, con «Gestionar soporte», se responde; sin el permiso, el aviso', async () => {
    show(ticket({ status: 'open' }));
    expect(await screen.findByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument();
    cleanup();
    perms.canManage = false;
    show(ticket({ status: 'open' }));
    expect(await screen.findByText(/hace falta el permiso «Gestionar soporte»/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument();
  });

  it('el ✓✓ del hilo del ticket sale de `counterpartLastReadSeq` si la API lo manda (corrección 1)', async () => {
    api.getCompanyTicket.mockResolvedValue({ ...ticket({ status: 'open' }), counterpartLastReadSeq: 1 });
    api.listCompanyTicketMessages.mockResolvedValue({
      items: [msg(1, { conversationId: 'c-t1', isMine: true, party: 'company', body: 'mío' })],
      hasMore: false,
    });
    render(
      <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url="/support/tickets/t-1">
        <Routes>
          <Route path="/support/tickets/:id" element={<CompanyTicketDetail />} />
        </Routes>
      </ChatProviders>,
    );
    expect(await screen.findByLabelText('Leído')).toBeInTheDocument();
  });

  it('si salió de un chat, lleva a ese punto', async () => {
    show(ticket({ origin: { conversationId: 'c-9', fromSeq: 3, toSeq: 5 } }));
    expect(await screen.findByRole('link', { name: 'Ver en el chat' })).toHaveAttribute('href', '/support/chats/c-9');
  });
});
