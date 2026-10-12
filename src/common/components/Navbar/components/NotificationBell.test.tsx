import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map<string, (payload: unknown) => void>());
const notifyInfo = vi.hoisted(() => vi.fn());

vi.mock('../../../../context/useSocketContext', () => ({
  useSocketContext: () => ({
    isOnline: true,
    subscribe: (event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler);
      return () => {
        unsubscribed(event);
        handlers.delete(event);
      };
    },
  }),
}));
const scope = vi.hoisted(() => ({ viewing: null as string | null }));
vi.mock('../../../../hooks/useDistributorEventFilter', () => ({
  useDistributorEventFilter: () => (payload?: { distributorId?: string }) =>
    !scope.viewing || !payload?.distributorId || payload.distributorId === scope.viewing,
}));
vi.mock('../../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { info: notifyInfo, success: vi.fn(), error: vi.fn() },
}));

import { NotificationBell } from './NotificationBell';

const unsubscribed = vi.hoisted(() => vi.fn());

const setup = () => {
  const client = new QueryClient();
  const spy = vi.spyOn(client, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return Object.assign(spy, { unmount: view.unmount });
};

beforeEach(() => {
  handlers.clear();
  notifyInfo.mockReset();
  scope.viewing = null;
  unsubscribed.mockReset();
});
afterEach(cleanup);

describe('NotificationBell: incident:created', () => {
  it('un cobro impago avisa con un toast, suma una notificación sin leer y refresca incidencias, pedidos y reportes', () => {
    const spy = setup();
    act(() => {
      handlers.get('incident:created')?.({
        incidentId: 'inc-1',
        orderId: 'aaaaaaaa-1111',
        type: 'unpaid_collection',
        description: 'No pudo cobrar',
      });
    });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Cobro impago en el pedido'));
    expect(screen.getByRole('button', { name: /1 sin leer/ })).toBeInTheDocument();
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey as string[])[0]);
    expect(keys).toEqual(expect.arrayContaining(['incidents', 'orders', 'reports']));
    fireEvent.click(screen.getByRole('button', { name: /1 sin leer/ }));
    expect(screen.getByText('Cobro impago: el chofer no pudo cobrar')).toBeInTheDocument();
  });

  it('una incidencia de otro tipo no genera aviso', () => {
    setup();
    act(() => {
      handlers.get('incident:created')?.({ incidentId: 'inc-2', orderId: 'bbbbbbbb-2', type: 'damaged' });
    });
    expect(notifyInfo).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sin leer/ })).toBeNull();
  });
});

describe('NotificationBell: suscripción', () => {
  it('al desmontar se da de baja de incident:created y deja de avisar', () => {
    const view = setup();
    expect(handlers.has('incident:created')).toBe(true);
    view.unmount();
    expect(unsubscribed).toHaveBeenCalledWith('incident:created');
    expect(handlers.has('incident:created')).toBe(false);
  });
});

describe('NotificationBell: «Ver como» otra distribuidora', () => {
  it('ignora incident:created y order:* de otra distribuidora y acepta los de la elegida', () => {
    scope.viewing = 'dist-A';
    setup();
    act(() => {
      handlers.get('incident:created')?.({
        incidentId: 'i-1',
        orderId: 'aaaaaaaa-1',
        distributorId: 'dist-B',
        type: 'unpaid_collection',
      });
      handlers.get('order:created')?.({ orderId: 'bbbbbbbb-2', distributorId: 'dist-B', totalAmount: 100 });
    });
    expect(notifyInfo).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sin leer/ })).toBeNull();
    act(() => {
      handlers.get('incident:created')?.({
        incidentId: 'i-2',
        orderId: 'cccccccc-3',
        distributorId: 'dist-A',
        type: 'unpaid_collection',
      });
      handlers.get('order:created')?.({ orderId: 'dddddddd-4', distributorId: 'dist-A', totalAmount: 100 });
    });
    expect(notifyInfo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /2 sin leer/ })).toBeInTheDocument();
  });
});
