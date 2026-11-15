import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, newQueryClient, ticket } from '../../../test/chatFixtures';

vi.mock('../../../common/components/ui/ResponsiveTable', () => import('../../../test/responsiveTableStub'));
const list = vi.hoisted(() => vi.fn<[object], Promise<unknown>>());
vi.mock('../../../services/api/httpClient', () => ({
  http: { get: async (_url: string, config: { params: object }) => ({ data: await list(config.params) }) },
}));
vi.mock('../components/CompanySelect', () => ({ CompanySelect: () => null }));

import { PlatformTickets } from './PlatformTickets';

const COUNTS = { new: 2, open: 1, waitingCompany: 3, mine: 1, overdue: 1 };

afterEach(cleanup);
beforeEach(() => {
  list.mockReset().mockImplementation(({ status }: { status?: string }) =>
    Promise.resolve({
      items: [
        ticket({
          id: `t-${status ?? 'all'}`,
          status: (status as 'closed') ?? 'closed',
          subject: `Ticket ${status ?? 'todos'}`,
        }),
      ],
      total: 1,
      counts: COUNTS,
    }),
  );
});

const show = (url = '/platform/tickets') =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url={url}>
      <PlatformTickets />
    </ChatProviders>,
  );

const statuses = () => list.mock.calls.map(([p]) => (p as { status?: string }).status ?? 'todos');

describe('PlatformTickets: la cola de la plataforma', () => {
  it('arranca en «Activos»: nuevos, en curso y esperando a la empresa juntos', async () => {
    show();
    await waitFor(() => expect(statuses()).toEqual(expect.arrayContaining(['new', 'open', 'waiting_company'])));
    await waitFor(() => expect(screen.getByRole('tab', { name: /Nuevos/ })).toHaveTextContent('2'));
  });

  it('«Cerrados» y «Resueltos» se pueden consultar (auditoría), y «Todos» no filtra', async () => {
    show();
    fireEvent.click(await screen.findByRole('tab', { name: /Cerrados/ }));
    expect(await screen.findByText('Ticket closed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Resueltos/ }));
    expect(await screen.findByText('Ticket resolved')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Todos/ }));
    expect(await screen.findByText('Ticket todos')).toBeInTheDocument();
  });

  it('la búsqueda por número viaja a la API', async () => {
    show('/platform/tickets?tab=all');
    await screen.findByText('Ticket todos');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'T-000123' } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'T-000123' })));
  });
});
