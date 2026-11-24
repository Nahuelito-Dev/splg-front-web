import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FailedVisit, FailedVisitOrder, RevisitDay } from '../../services/api/types';

const perms = vi.hoisted(() => ({
  value: { canOperate: true, operateHint: undefined, needsDistributor: false } as Record<string, unknown>,
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => perms.value,
  useDebounce: <T,>(value: T) => value,
}));
vi.mock('../../context/useSocketContext', () => ({
  useSocketContext: () => ({ isOnline: true, subscribe: () => () => undefined }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

const row = (id: string, name: string, over: Partial<FailedVisitOrder> = {}): FailedVisitOrder =>
  ({
    orderId: `00000000-0000-4000-8000-000000${id}`,
    orderStatus: 'pending',
    deliveryMode: 'standard',
    revisitStatus: 'proposed',
    failedVisitCount: 1,
    lastFailedAt: '2026-11-21T13:00:00Z',
    lastReason: 'customer_absent',
    lastReasonLabel: 'El cliente no estaba',
    lastNote: null,
    lastDeliveryKind: 'single',
    lastDistanceMeters: 35,
    lastOutOfRange: false,
    customerName: name,
    customerPhone: '+5493764000000',
    address: 'Av. Siempre Viva 742',
    driverName: 'Juan Chofer',
    scheduledDate: '2026-11-26',
    timeSlotId: 'm',
    timeSlotName: 'Mañana',
    windowStart: '09:00:00',
    windowEnd: '13:00:00',
    total: 15000,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    ...over,
  }) as FailedVisitOrder;

const ROWS = [
  row('aaa111', 'Ana Pérez', { revisitStatus: 'awaiting_admin', failedVisitCount: 2 }),
  row('bbb222', 'Beto Gómez'),
  // Con «Todas (también cerradas)»: ya se entregó.
  row('ccc333', 'Ceci Ruiz', { orderStatus: 'delivered', revisitStatus: 'confirmed' }),
];

const HISTORY: FailedVisit[] = [
  {
    failedVisitId: 'v2',
    orderId: ROWS[0].orderId,
    visitNumber: 2,
    deliveryKind: 'single',
    reason: 'address_closed',
    reasonLabel: 'El domicilio estaba cerrado',
    note: 'Persiana baja',
    failedAt: '2026-11-21T13:00:00Z',
    latitude: -27.36,
    longitude: -55.9,
    accuracyMeters: 8,
    distanceMeters: 250,
    outOfRange: true,
    reportedByRole: 'delivery',
    reportedByName: 'Juan Chofer',
    outcome: 'awaiting_admin',
    agreedWithCustomer: false,
    proposedDate: null,
    proposedTimeSlotId: null,
    proposedTimeSlotName: null,
    resolution: null,
    resolvedAt: null,
    finalDate: null,
    finalTimeSlotName: null,
  },
];

const DAYS: RevisitDay[] = [
  {
    date: '2026-11-26',
    slots: [{ timeSlotId: 'm', name: 'Mañana', startTime: '09:00:00', endTime: '13:00:00', remaining: 4 }],
    canAgree: true,
  },
  {
    date: '2026-11-27',
    slots: [{ timeSlotId: 't', name: 'Tarde', startTime: '14:00:00', endTime: '18:00:00', remaining: 2 }],
    canAgree: true,
  },
];

const list = vi.hoisted(() => ({ filters: [] as unknown[], enabled: [] as boolean[] }));
const schedule = vi.hoisted(() => ({ mutate: vi.fn() }));
const assign = vi.hoisted(() => ({ mutate: vi.fn() }));
const cancel = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../../services/queries/failedVisits', () => ({
  useFailedVisitOrders: (filters: unknown, enabled: boolean) => {
    list.filters.push(filters);
    list.enabled.push(enabled);
    return { data: { data: ROWS, total: ROWS.length, limit: 10, offset: 0 }, isLoading: false, isFetching: false };
  },
  useOrderFailedVisits: () => ({ data: HISTORY, isLoading: false, isError: false }),
  useRevisitOptions: () => ({ data: DAYS, isLoading: false, isError: false }),
  useScheduleRevisit: () => ({ mutate: schedule.mutate, isPending: false }),
}));
vi.mock('../../services/queries/orders', () => ({
  useAssignOrderDelivery: () => ({ mutate: assign.mutate, isPending: false, error: null }),
  useCancelOrder: () => ({ mutate: cancel.mutate, isPending: false }),
}));
vi.mock('../Orders/components/AssignDriverModal', () => ({
  AssignDriverModal: ({ open, onConfirm }: { open: boolean; onConfirm: (id: string) => void }) =>
    open ? (
      <button type="button" onClick={() => onConfirm('chofer-9')}>
        Asignar a chofer-9
      </button>
    ) : null,
}));
vi.mock('../Orders/components/CancelOrderModal', () => ({
  CancelOrderModal: ({ open, onConfirm }: { open: boolean; onConfirm: (reason: string) => void }) =>
    open ? (
      <button type="button" onClick={() => onConfirm('El cliente ya no lo quiere')}>
        Confirmar cancelación
      </button>
    ) : null,
}));

import { FailedVisits } from './FailedVisits';

const Search = () => <output data-testid="search">{useLocation().search}</output>;
const renderPage = (url = '/failed-visits') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <FailedVisits />
      <Search />
    </MemoryRouter>,
  );
const lastFilters = () => list.filters[list.filters.length - 1];

beforeEach(() => {
  list.filters = [];
  list.enabled = [];
  schedule.mutate.mockReset();
  assign.mutate.mockReset();
  cancel.mutate.mockReset();
  perms.value = { canOperate: true, operateHint: undefined, needsDistributor: false };
});
afterEach(cleanup);

describe('FailedVisits', () => {
  it('lista los pedidos con su última visita, cuántas llevan y la nueva visita', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Visitas fallidas' })).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Beto Gómez')).toBeInTheDocument();
    expect(lastFilters()).toEqual({
      status: 'open',
      reason: undefined,
      from: undefined,
      to: undefined,
      term: undefined,
      limit: 10,
      offset: 0,
    });
  });

  it('los filtros salen de la URL, van al back y se ven como chips', () => {
    renderPage('/failed-visits?status=awaiting_admin&reason=rejected&from=2026-11-01&q=ana&page=2');
    expect(list.filters[0]).toEqual({
      status: 'awaiting_admin',
      reason: 'rejected',
      from: '2026-11-01',
      to: undefined,
      term: 'ana',
      limit: 10,
      offset: 10,
    });
    const chips = screen.getByRole('group', { name: 'Filtros activos' });
    expect(chips).toHaveTextContent('Decidís vos');
    expect(chips).toHaveTextContent('Rechazó el pedido');
    expect(chips).toHaveTextContent('"ana"');
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('un valor de filtro que no existe cae en el de por omisión', () => {
    renderPage('/failed-visits?status=cualquiera&reason=otra');
    expect(lastFilters()).toMatchObject({ status: 'open', reason: undefined });
  });

  it('el detalle muestra el historial con el punto, la distancia, el aviso de fuera de radio y las acciones del admin', () => {
    renderPage();
    fireEvent.click(screen.getByText('Ana Pérez'));
    const dialog = screen.getByRole('dialog', { name: 'Pedido #AAA111' });
    expect(dialog).toHaveTextContent('2 visitas fallidas');
    expect(dialog).toHaveTextContent('El sistema dejó de reprogramar este pedido');
    expect(dialog).toHaveTextContent('Domicilio cerrado');
    expect(dialog).toHaveTextContent('Persiana baja');
    expect(dialog).toHaveTextContent('Informó a 250 m del domicilio (precisión ±8 m)');
    expect(dialog).toHaveTextContent('Se informó fuera del radio del domicilio');
    expect(within(dialog).getByRole('link', { name: /Ver en Google Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-27.36,-55.9',
    );
    expect(within(dialog).getByRole('link', { name: 'Ver el pedido completo' })).toHaveAttribute(
      'href',
      `/orders/${ROWS[0].orderId}`,
    );
    for (const name of ['Fijar día y franja', 'Reasignar', 'Cancelar pedido']) {
      expect(within(dialog).getByRole('button', { name })).toBeEnabled();
    }
    expect(screen.getByTestId('search')).toHaveTextContent(`order=${ROWS[0].orderId}`);
  });

  it('una visita de un pedido ya cerrado también abre el detalle con su historial, pero sin acciones', () => {
    renderPage('/failed-visits?status=all');
    fireEvent.click(screen.getByText('Ceci Ruiz'));
    const dialog = screen.getByRole('dialog', { name: 'Pedido #CCC333' });
    expect(within(dialog).getByRole('region', { name: 'Historial de visitas' })).toHaveTextContent('Persiana baja');
    expect(within(dialog).getByRole('link', { name: 'Ver el pedido completo' })).toBeInTheDocument();
    for (const name of ['Fijar día y franja', 'Reasignar', 'Cancelar pedido']) {
      expect(within(dialog).queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(dialog).not.toHaveTextContent('El sistema dejó de reprogramar este pedido');
    // La nueva visita no se muestra «Confirmada»: manda el estado del pedido.
    expect(dialog).toHaveTextContent('Entregado');
    expect(dialog).not.toHaveTextContent('Confirmada');
  });

  it('fijar día y franja: propone el primer día con lugar, deja elegir otro y manda lo elegido', () => {
    renderPage(`/failed-visits?order=${ROWS[0].orderId}`);
    fireEvent.click(screen.getByRole('button', { name: 'Fijar día y franja' }));
    const modal = screen.getByRole('dialog', { name: 'Fijar la nueva visita' });
    expect(within(modal).getByLabelText('Franja horaria')).toHaveValue('m');
    fireEvent.change(within(modal).getByLabelText('Día'), { target: { value: '2026-11-27' } });
    // Al cambiar de día, la franja pasa a una de ese día.
    expect(within(modal).getByLabelText('Franja horaria')).toHaveValue('t');
    expect(within(modal).getByLabelText('Franja horaria')).toHaveTextContent('Tarde · 14:00 a 18:00 (2 lugares)');
    fireEvent.click(within(modal).getByRole('button', { name: 'Fijar visita' }));
    expect(schedule.mutate).toHaveBeenCalledWith(
      { orderId: ROWS[0].orderId, body: { scheduledDate: '2026-11-27', timeSlotId: 't' } },
      expect.anything(),
    );
  });

  it('reasignar y cancelar usan los endpoints de siempre del pedido', () => {
    renderPage(`/failed-visits?order=${ROWS[0].orderId}`);
    fireEvent.click(screen.getByRole('button', { name: 'Reasignar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Asignar a chofer-9', hidden: true }));
    expect(assign.mutate).toHaveBeenCalledWith({ id: ROWS[0].orderId, deliveryId: 'chofer-9' }, expect.anything());

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación', hidden: true }));
    expect(cancel.mutate).toHaveBeenCalledWith(
      { id: ROWS[0].orderId, body: { reason: 'El cliente ya no lo quiere' } },
      expect.anything(),
    );
  });

  it('en sólo lectura las acciones quedan apagadas con el motivo', () => {
    perms.value = { canOperate: false, operateHint: 'Modo soporte: sólo lectura', needsDistributor: false };
    renderPage(`/failed-visits?order=${ROWS[0].orderId}`);
    const dialog = screen.getByRole('dialog', { name: 'Pedido #AAA111' });
    expect(dialog).toHaveTextContent('Modo soporte: sólo lectura');
    expect(within(dialog).getByRole('button', { name: 'Fijar día y franja' })).toBeDisabled();
  });

  it('el administrador general sin distribuidora no consulta y ve qué hacer', () => {
    perms.value = { canOperate: false, needsDistributor: true };
    renderPage();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(list.enabled.every((enabled) => !enabled)).toBe(true);
  });
});
