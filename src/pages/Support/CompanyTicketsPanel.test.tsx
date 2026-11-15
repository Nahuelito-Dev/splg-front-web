import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient, ticketSummary } from '../../test/chatFixtures';

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
// La API de verdad, con el cliente HTTP falso: así se ve qué le pide la pantalla a `GET /v2/company/tickets`.
const list = vi.hoisted(() => vi.fn<[object], Promise<unknown>>());
vi.mock('../../services/api/httpClient', () => ({
  http: { get: async (_url: string, config: { params: object }) => ({ data: await list(config.params) }) },
}));
const api = { listCompanyTickets: list };
vi.mock('../../common/support/useSupportAccessActions', () => ({
  useSupportAccessPermissions: () => ({ canView: true, canManage: true, isPending: false }),
}));

import { CompanyTicketsPanel } from './CompanyTicketsPanel';

afterEach(cleanup);
beforeEach(() => {
  api.listCompanyTickets.mockReset().mockImplementation(({ status }: { status?: string }) =>
    Promise.resolve({
      items: [
        ticketSummary({
          id: `t-${status ?? 'all'}`,
          status: (status as 'closed') ?? 'closed',
          subject: `Ticket ${status ?? 'todos'}`,
        }),
      ],
      total: 1,
    }),
  );
});

const show = () =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url="/support?tab=tickets">
      <CompanyTicketsPanel />
    </ChatProviders>,
  );

const statuses = () =>
  api.listCompanyTickets.mock.calls.map(([params]) => (params as { status?: string }).status ?? 'todos');

describe('CompanyTicketsPanel: los tickets de la empresa', () => {
  it('por defecto se ven todos, también los cerrados (auditoría)', async () => {
    show();
    expect(await screen.findByText('Ticket todos')).toBeInTheDocument();
    expect(screen.getByText('Cerrado')).toBeInTheDocument();
    expect(statuses()).toEqual(['todos']);
  });

  it('«Activos» junta nuevos, en curso y esperando a la empresa', async () => {
    show();
    await screen.findByText('Ticket todos');
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'active' } });
    await waitFor(() => expect(statuses()).toEqual(expect.arrayContaining(['new', 'open', 'waiting_company'])));
    expect(await screen.findByText('Estado: Activos')).toBeInTheDocument();
  });

  it('«Cerrados» y «Resueltos» piden ese estado', async () => {
    show();
    await screen.findByText('Ticket todos');
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'closed' } });
    expect(await screen.findByText('Ticket closed')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'resolved' } });
    expect(await screen.findByText('Ticket resolved')).toBeInTheDocument();
  });

  it('busca por número', async () => {
    api.listCompanyTickets.mockResolvedValue({
      items: [
        ticketSummary({ id: 'a', number: 'T-000007', subject: 'Siete' }),
        ticketSummary({ id: 'b', number: 'T-000008', subject: 'Ocho' }),
      ],
      total: 2,
    });
    show();
    await screen.findByText('Siete');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'T-8' } });
    await waitFor(() => expect(screen.queryByText('Siete')).not.toBeInTheDocument());
    expect(screen.getByText('Ocho')).toBeInTheDocument();
  });
});
