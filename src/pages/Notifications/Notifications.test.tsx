import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  list: vi.fn(),
  count: 2,
  markRead: vi.fn(),
  markAll: vi.fn(),
}));
vi.mock('../../services/queries/adminNotifications', () => ({
  useAdminNotifications: (params: unknown) => state.list(params) as unknown,
  useAdminUnreadCount: () => ({ data: { count: state.count } }),
  useMarkAdminNotificationRead: () => ({ mutate: state.markRead, isPending: false }),
  useMarkAllAdminNotificationsRead: () => ({ mutate: state.markAll, isPending: false }),
}));

import { Notifications } from './Notifications';

const item = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'claim_created',
  title: `Aviso ${id}`,
  body: `Cuerpo ${id}`,
  link: { entity: 'claim', id: `claim-${id}` },
  createdAt: '2026-10-28T10:00:00.000Z',
  readAt: null,
  ...over,
});

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

const setup = (url = '/notifications') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Notifications />
      <Where />
    </MemoryRouter>,
  );

beforeEach(() => {
  state.count = 2;
  state.markRead.mockReset();
  state.markAll.mockReset();
  state.list.mockReset();
  state.list.mockReturnValue({
    data: { items: [item('a'), item('b', { readAt: '2026-10-28T11:00:00.000Z' })], total: 2 },
  });
});
afterEach(cleanup);

describe('Notifications', () => {
  it('lista los avisos con título, cuerpo y si están leídos', () => {
    setup();
    expect(screen.getByText('Aviso a')).toBeInTheDocument();
    expect(screen.getByText('Cuerpo b')).toBeInTheDocument();
    expect(screen.getByText(/· Sin leer/)).toBeInTheDocument();
    expect(screen.getByText(/· Leída/)).toBeInTheDocument();
  });

  it('la pestaña Sin leer pide sólo los no leídos y queda en la URL', () => {
    setup();
    expect(state.list).toHaveBeenLastCalledWith({ unread: false, limit: 25, offset: 0 });
    fireEvent.click(screen.getByRole('tab', { name: /Sin leer/ }));
    expect(state.list).toHaveBeenLastCalledWith({ unread: true, limit: 25, offset: 0 });
    expect(screen.getByTestId('where')).toHaveTextContent('tab=unread');
  });

  it('pagina contra la API con limit y offset', () => {
    state.list.mockReturnValue({ data: { items: [item('a')], total: 60 } });
    setup();
    expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(state.list).toHaveBeenLastCalledWith({ unread: false, limit: 25, offset: 25 });
    expect(screen.getByTestId('where')).toHaveTextContent('page=2');
  });

  it('el click marca leído el aviso y navega a su destino', () => {
    setup();
    fireEvent.click(screen.getByText('Aviso a'));
    expect(state.markRead).toHaveBeenCalledWith('a');
    expect(screen.getByTestId('where')).toHaveTextContent('/claims?claim=claim-a');
  });

  it('un aviso ya leído y sin enlace no marca ni navega', () => {
    state.list.mockReturnValue({
      data: { items: [item('c', { readAt: '2026-10-28T11:00:00.000Z', link: null })], total: 1 },
    });
    setup();
    fireEvent.click(screen.getByText('Aviso c'));
    expect(state.markRead).not.toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/notifications');
  });

  it('«Marcar todas como leídas» llama a read-all y se apaga sin avisos pendientes', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Marcar todas como leídas/ }));
    expect(state.markAll).toHaveBeenCalledTimes(1);
    cleanup();
    state.count = 0;
    setup();
    expect(screen.getByRole('button', { name: /Marcar todas como leídas/ })).toBeDisabled();
  });

  it('muestra el vacío de cada pestaña', () => {
    state.list.mockReturnValue({ data: { items: [], total: 0 } });
    setup();
    expect(screen.getByText('Todavía no hay notificaciones')).toBeInTheDocument();
    cleanup();
    setup('/notifications?tab=unread');
    expect(screen.getByText('Estás al día')).toBeInTheDocument();
  });

  it('muestra el esqueleto mientras carga y el error con reintento', () => {
    state.list.mockReturnValue({ isPending: true });
    setup();
    expect(screen.getByRole('status', { name: 'Cargando notificaciones' })).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    state.list.mockReturnValue({ error: new Error('boom'), refetch });
    setup();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
