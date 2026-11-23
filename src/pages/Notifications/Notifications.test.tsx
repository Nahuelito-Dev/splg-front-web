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

const insurance = vi.hoisted(() => ({
  approve: vi.fn(),
  target: vi.fn(),
  installment: undefined as unknown,
  confirm: vi.fn(),
  permiso: { allowed: true, known: true },
}));
vi.mock('../../services/queries/insurance', () => ({
  useApproveInsuranceInstallment: () => ({ mutate: insurance.approve, isPending: false }),
  useInstallmentTarget: () => insurance.target,
  useInsuranceInstallment: () => ({ data: insurance.installment }),
}));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  confirm: insurance.confirm,
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
  usePermiso: () => insurance.permiso,
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

describe('Notifications: aprobar el pago de una cuota', () => {
  const approvalItem = () =>
    item('q', {
      kind: 'insurance_installment_due',
      title: 'Cuota de seguro por vencer: OVQ621',
      link: { entity: 'insurance-installment', id: 'inst-1' },
    });

  beforeEach(() => {
    insurance.approve.mockReset();
    insurance.target.mockReset();
    insurance.confirm.mockReset();
    insurance.confirm.mockResolvedValue(true);
    insurance.permiso = { allowed: true, known: true };
    insurance.installment = { status: 'pending', approvalStatus: 'awaiting', label: '4/6', amount: 29958 };
    state.list.mockReturnValue({ data: { items: [approvalItem(), item('a')], total: 2 } });
  });

  it('el aviso de la cuota trae «Aprobar pago» y los demás no', () => {
    setup();
    expect(screen.getAllByRole('button', { name: 'Aprobar pago' })).toHaveLength(1);
  });

  it('aprobar pide confirmación, llama con la cuota del aviso y lo marca leído', async () => {
    insurance.approve.mockImplementation((_id: string, opts: { onSuccess: () => void }) => opts.onSuccess());
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar pago' }));
    await vi.waitFor(() => expect(insurance.approve).toHaveBeenCalledWith('inst-1', expect.anything()));
    expect(insurance.confirm).toHaveBeenCalled();
    expect(state.markRead).toHaveBeenCalledWith('q');
  });

  it('si no se confirma, no aprueba', async () => {
    insurance.confirm.mockResolvedValue(false);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar pago' }));
    await vi.waitFor(() => expect(insurance.confirm).toHaveBeenCalled());
    expect(insurance.approve).not.toHaveBeenCalled();
  });

  it('sin permiso flota.gestionar, o con la cuota ya aprobada o paga, no hay botón', () => {
    insurance.permiso = { allowed: false, known: true };
    const { unmount } = setup();
    expect(screen.queryByRole('button', { name: 'Aprobar pago' })).not.toBeInTheDocument();
    unmount();
    insurance.permiso = { allowed: true, known: true };
    insurance.installment = { status: 'pending', approvalStatus: 'approved', label: '4/6', amount: 1 };
    const second = setup();
    expect(screen.queryByRole('button', { name: 'Aprobar pago' })).not.toBeInTheDocument();
    second.unmount();
    insurance.installment = { status: 'paid', approvalStatus: 'approved', label: '4/6', amount: 1 };
    setup();
    expect(screen.queryByRole('button', { name: 'Aprobar pago' })).not.toBeInTheDocument();
  });

  it('abrir el aviso resuelve el vehículo de la cuota y navega a su pestaña Seguro', async () => {
    insurance.target.mockResolvedValue('/cars/details/c-1?tab=insurance');
    setup();
    fireEvent.click(screen.getByText('Cuota de seguro por vencer: OVQ621'));
    await vi.waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/cars/details/c-1?tab=insurance'));
    expect(insurance.target).toHaveBeenCalledWith('inst-1');
  });
});

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
