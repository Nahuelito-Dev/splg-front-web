import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { describeListStates, mutation, ok, renderPage } from '../../test/pageTest';
import { companyItem } from '../../test/platformFixtures';

const state = vi.hoisted(() => ({
  list: undefined as unknown,
  detail: undefined as unknown,
  params: vi.fn(),
  cut: undefined as unknown,
  entries: [] as unknown[],
  mine: null as { id: string; status: string } | null,
}));
vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../services/queries/supportSessions', () => ({
  useSupportSessions: (params: unknown) => {
    state.params(params);
    return state.list;
  },
  useSupportSessionDetail: (id: string | undefined) =>
    id ? state.detail : { data: undefined, error: null, isPending: false, refetch: vi.fn() },
  useSupportSessionEntries: () => ok({ rows: state.entries, total: state.entries.length }),
  useCutSupportSession: () => state.cut,
}));
vi.mock('../../hooks/useSupportSession', () => ({
  useSupportSession: () => ({ loaded: true, session: state.mine, active: null, pending: null }),
}));
vi.mock('../../services/queries/platformConsole', () => ({
  useAllPlatformCompanies: () => ({
    companies: [companyItem({ id: 'c1', name: 'Gas del Norte' })],
    total: 1,
    loading: false,
    error: null,
  }),
}));
const accounts = vi.hoisted(() => vi.fn());
vi.mock('../../services/queries/users', () => ({
  usePlatformAccounts: (term: string, options: unknown) => accounts(term, options) as unknown,
}));
const notifications = vi.hoisted(() => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  confirm: vi.fn(),
}));
vi.mock('../../utils/notifications', () => notifications);

import { SupportSessions } from './SupportSessions';

const session = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  distributorId: 'c1',
  distributorName: 'Gas del Norte',
  requestedBy: { userId: 'u-ana', fullName: 'Ana Plataforma', photoUrl: null },
  kind: 'consented',
  status: 'active',
  reason: 'Revisar por qué no salen los pedidos de la zona norte',
  ticketRef: null,
  scope: [],
  requestedMinutes: 60,
  requestExpiresAt: null,
  decidedBy: { userId: 'u-adm', fullName: 'Admin Norte', photoUrl: null },
  decidedAt: '2026-11-14T15:00:00.000Z',
  decisionNote: null,
  startedAt: '2026-11-14T15:00:00.000Z',
  expiresAt: '2026-11-14T16:00:00.000Z',
  endedAt: null,
  endedBy: null,
  endReason: null,
  createdAt: '2026-11-14T14:55:00.000Z',
  ...over,
});
const list = (items = [session()]) => ok({ items, total: items.length });
const URL = '/platform/support-sessions';
const REASON = 'La empresa pidió por teléfono cortar el acceso';

describeListStates({
  name: 'Sesiones de soporte',
  url: URL,
  page: <SupportSessions />,
  setResult: (result) => {
    state.list = result;
  },
  withRow: () => list(),
  withoutRows: () => list([]),
  rowText: 'Ana Plataforma',
  emptyText: 'Sin sesiones de soporte',
  loadingLabel: 'Cargando sesiones',
});

beforeEach(() => {
  state.list = list();
  state.detail = ok(session());
  state.cut = mutation();
  state.mine = null;
  state.entries = [];
  accounts.mockReturnValue({ accounts: [], loading: false, error: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const openFirst = () => fireEvent.click(screen.getByRole('button', { name: /Ver la sesión de Ana Plataforma/ }));
const cutButton = () => within(screen.getByRole('dialog')).getByRole('button', { name: /Cortar sesión/ });
const cutCalls = () => (state.cut as ReturnType<typeof mutation>).mutate.mock.calls;

describe('Sesiones de soporte', () => {
  it('muestra quién la pidió, la empresa, el estado y el motivo', () => {
    renderPage(<SupportSessions />, { url: URL });
    expect(screen.getByText('Ana Plataforma')).toBeInTheDocument();
    expect(screen.getByText(/Gas del Norte ·/)).toBeInTheDocument();
    expect(screen.getAllByText('Activa').length).toBeGreaterThan(0);
    expect(screen.getByText(/zona norte/)).toBeInTheDocument();
  });

  it('los filtros de la URL viajan a la API, con la página del servidor', () => {
    renderPage(<SupportSessions />, {
      url: `${URL}?status=revoked&company=c1&by=u-ana&byName=Ana&from=2026-11-01&to=2026-11-14&page=3&size=10`,
    });
    expect(state.params).toHaveBeenLastCalledWith({
      status: 'revoked',
      distributorId: 'c1',
      requestedBy: 'u-ana',
      from: '2026-11-01',
      to: '2026-11-14',
      limit: 10,
      offset: 20,
    });
    const chips = screen.getByRole('group', { name: 'Filtros activos' });
    expect(chips).toHaveTextContent('Revocada');
    expect(chips).toHaveTextContent('Pedida por Ana');
  });

  it('un estado inventado en la URL no viaja a la API', () => {
    renderPage(<SupportSessions />, { url: `${URL}?status=cualquiera` });
    expect(state.params).toHaveBeenLastCalledWith(expect.objectContaining({ status: '' }));
  });

  it('cambiar el estado filtra y vuelve a la primera página', () => {
    renderPage(<SupportSessions />, { url: `${URL}?page=2` });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'active' } });
    expect(state.params).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'active', offset: 0 }));
  });

  it('quién la pidió se elige en el selector de cuentas de la plataforma', async () => {
    accounts.mockReturnValue({
      accounts: [{ user_id: 'u-ana', full_name: 'Ana Plataforma', email: 'ana@x.com', role: { type: 'super_admin' } }],
      loading: false,
      error: null,
    });
    state.list = list([]);
    renderPage(<SupportSessions />, { url: URL });
    fireEvent.change(screen.getByLabelText('Quién la pidió'), { target: { value: 'ana' } });
    await waitFor(() => expect(accounts).toHaveBeenLastCalledWith('ana', { enabled: true }));
    fireEvent.click(screen.getByRole('button', { name: /Ana Plataforma/ }));
    expect(state.params).toHaveBeenLastCalledWith(expect.objectContaining({ requestedBy: 'u-ana' }));
  });

  it('el filtro de la empresa llega desde la ficha (?company=)', () => {
    renderPage(<SupportSessions />, { url: `${URL}?company=c1` });
    expect(screen.getByLabelText('Empresa')).toHaveValue('c1');
    expect(state.params).toHaveBeenLastCalledWith(expect.objectContaining({ distributorId: 'c1' }));
  });

  it('el detalle muestra la empresa, el motivo y lo que miró (vacío)', () => {
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Sesión de soporte')).toBeInTheDocument();
    expect(within(dialog).getByText('Gas del Norte')).toBeInTheDocument();
    expect(within(dialog).getByText('Sin consultas registradas')).toBeInTheDocument();
  });

  it('el detalle de una sesión que no existe lo dice', () => {
    state.detail = { data: undefined, error: new ApiError(404, ['No existe']), isPending: false, refetch: vi.fn() };
    renderPage(<SupportSessions />, { url: `${URL}?session=otra` });
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('La sesión no existe')).toBeInTheDocument();
    expect(dialog.getByText('La sesión no existe o ya no está disponible.')).toBeInTheDocument();
    expect(dialog.queryByText(/otra distribuidora/)).toBeNull();
  });

  it('una sesión terminada no se puede cortar', () => {
    state.list = list([session({ status: 'ended', endReason: 'exit', endedAt: '2026-11-14T15:30:00.000Z' })]);
    state.detail = ok(session({ status: 'ended', endReason: 'exit', endedAt: '2026-11-14T15:30:00.000Z' }));
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /Cortar sesión/ })).toBeNull();
  });

  it('la propia se corta con una confirmación y sin motivo', async () => {
    state.mine = { id: 's1', status: 'active' };
    notifications.confirm.mockResolvedValue(true);
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(cutButton());
    await waitFor(() => expect(cutCalls()).toHaveLength(1));
    expect(notifications.confirm).toHaveBeenCalled();
    expect(cutCalls()[0]?.[0]).toEqual({ id: 's1' });
  });

  it('la propia no se corta si no se confirma', async () => {
    state.mine = { id: 's1', status: 'active' };
    notifications.confirm.mockResolvedValue(false);
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(cutButton());
    await waitFor(() => expect(notifications.confirm).toHaveBeenCalled());
    expect(cutCalls()).toHaveLength(0);
  });

  it('la de otro pide el motivo (20 a 1000 caracteres) y lo manda', () => {
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(cutButton());
    expect(notifications.confirm).not.toHaveBeenCalled();
    const modal = screen.getByRole('dialog', { name: 'Cortar la sesión de soporte' });
    const reason = within(modal).getByLabelText(/Motivo/);

    fireEvent.change(reason, { target: { value: 'muy corto' } });
    fireEvent.blur(reason);
    fireEvent.click(within(modal).getByRole('button', { name: /Cortar sesión/ }));
    expect(within(modal).getByText(/al menos 20 caracteres/)).toBeInTheDocument();
    expect(cutCalls()).toHaveLength(0);

    fireEvent.change(reason, { target: { value: `   ${REASON}   ` } });
    fireEvent.click(within(modal).getByRole('button', { name: /Cortar sesión/ }));
    expect(cutCalls()).toHaveLength(1);
    expect(cutCalls()[0]?.[0]).toEqual({ id: 's1', body: { reason: REASON } });
  });

  it('un motivo de más de 1000 caracteres no se manda', () => {
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(cutButton());
    const modal = screen.getByRole('dialog', { name: 'Cortar la sesión de soporte' });
    const reason = within(modal).getByLabelText(/Motivo/);
    fireEvent.change(reason, { target: { value: 'x'.repeat(1001) } });
    fireEvent.blur(reason);
    fireEvent.click(within(modal).getByRole('button', { name: /Cortar sesión/ }));
    expect(within(modal).getByText(/hasta 1000 caracteres/)).toBeInTheDocument();
    expect(cutCalls()).toHaveLength(0);
  });

  it('un 409 (ya había terminado) se muestra con el mensaje de la API', async () => {
    const conflict = new ApiError(409, ['La sesión de soporte ya terminó'], 'SUPPORT_SESSION_ALREADY_ENDED');
    state.cut = mutation({
      mutate: vi.fn((_vars: unknown, options?: { onError?: (e: unknown) => void }) => options?.onError?.(conflict)),
    });
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(cutButton());
    const modal = screen.getByRole('dialog', { name: 'Cortar la sesión de soporte' });
    fireEvent.change(within(modal).getByLabelText(/Motivo/), { target: { value: REASON } });
    fireEvent.click(within(modal).getByRole('button', { name: /Cortar sesión/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La sesión de soporte ya terminó');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cortar la sesión de soporte' })).toBeNull());
    expect(notifications.notify.success).not.toHaveBeenCalled();
  });

  it('otro error de la API queda en el modal, sin dar el corte por hecho', () => {
    const invalid = new ApiError(400, ['El motivo es obligatorio para cortar la sesión de otro administrador']);
    state.cut = mutation({
      mutate: vi.fn((_vars: unknown, options?: { onError?: (e: unknown) => void }) => options?.onError?.(invalid)),
    });
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(cutButton());
    const modal = screen.getByRole('dialog', { name: 'Cortar la sesión de soporte' });
    fireEvent.change(within(modal).getByLabelText(/Motivo/), { target: { value: REASON } });
    fireEvent.click(within(modal).getByRole('button', { name: /Cortar sesión/ }));
    expect(within(modal).getByRole('alert')).toHaveTextContent('El motivo es obligatorio');
    expect(notifications.notify.success).not.toHaveBeenCalled();
  });

  it('un 409 al cortar la propia también se ve con el mensaje de la API', async () => {
    state.mine = { id: 's1', status: 'active' };
    notifications.confirm.mockResolvedValue(true);
    const conflict = new ApiError(409, ['La sesión de soporte ya terminó'], 'SUPPORT_SESSION_ALREADY_ENDED');
    state.cut = mutation({
      mutate: vi.fn((_vars: unknown, options?: { onError?: (e: unknown) => void }) => options?.onError?.(conflict)),
    });
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(cutButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('La sesión de soporte ya terminó');
  });

  it('un pedido pendiente propio se cancela con confirmación y sin motivo', async () => {
    const pending = session({ status: 'pending', startedAt: null, expiresAt: null, decidedBy: null, decidedAt: null });
    state.list = list([pending]);
    state.detail = ok(pending);
    state.mine = { id: 's1', status: 'pending' };
    notifications.confirm.mockResolvedValue(true);
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Cancelar pedido/ }));
    await waitFor(() => expect(cutCalls()).toHaveLength(1));
    expect(notifications.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: '¿Cancelar tu pedido de acceso?', confirmText: 'Cancelar pedido' }),
    );
    expect(cutCalls()[0]?.[0]).toEqual({ id: 's1' });
  });

  it('un pedido pendiente ajeno se cancela con motivo', () => {
    const pending = session({ status: 'pending', startedAt: null, expiresAt: null, decidedBy: null, decidedAt: null });
    state.list = list([pending]);
    state.detail = ok(pending);
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Cancelar pedido/ }));
    expect(notifications.confirm).not.toHaveBeenCalled();
    const modal = screen.getByRole('dialog', { name: 'Cancelar el pedido de acceso' });
    fireEvent.change(within(modal).getByLabelText(/Motivo/), { target: { value: REASON } });
    fireEvent.click(within(modal).getByRole('button', { name: /Cancelar pedido/ }));
    expect(cutCalls()[0]?.[0]).toEqual({ id: 's1', body: { reason: REASON } });
  });

  it('«Qué miró» se lee en castellano, sin método ni ruta de la API', () => {
    state.entries = [
      {
        id: '1',
        at: '2026-11-14T15:10:00.000Z',
        httpMethod: 'GET',
        path: '/api/v2/orders',
        resource: 'orders',
        resourceId: null,
        query: null,
        statusCode: 200,
        items: 12,
        masked: true,
      },
    ];
    renderPage(<SupportSessions />, { url: URL });
    openFirst();
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Consultó · Pedidos')).toBeInTheDocument();
    expect(dialog.getByText(/12 registros · con datos ocultos/)).toBeInTheDocument();
    expect(dialog.queryByText(/GET|\/api\//)).toBeNull();
  });

  it('quien pidió la sesión, con su foto si la API la manda', () => {
    const PHOTO = 'https://fotos.test/ana.jpg';
    state.list = list([session({ requestedBy: { userId: 'u-ana', fullName: 'Ana Plataforma', photoUrl: PHOTO } })]);
    const { container } = renderPage(<SupportSessions />, { url: URL });
    expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
  });

  it('sin foto quedan las iniciales de quien la pidió', () => {
    const { container } = renderPage(<SupportSessions />, { url: URL });
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AP')).toBeInTheDocument();
  });
});
