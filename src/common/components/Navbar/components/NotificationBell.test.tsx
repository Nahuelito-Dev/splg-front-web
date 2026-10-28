import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, act, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map<string, (payload: unknown) => void>());
const notifyInfo = vi.hoisted(() => vi.fn());
const notifyError = vi.hoisted(() => vi.fn<[Error], void>());

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
  notify: { info: notifyInfo, success: vi.fn(), error: notifyError },
}));

const bandeja = vi.hoisted(() => ({
  items: [] as unknown[],
  count: 0,
  markRead: vi.fn(),
  markAll: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock('../../../../services/queries/adminNotifications', () => ({
  useAdminNotifications: () => ({ data: { items: bandeja.items, total: bandeja.items.length } }),
  useAdminUnreadCount: () => ({ data: { count: bandeja.count } }),
  useMarkAdminNotificationRead: () => ({ mutate: bandeja.markRead }),
  useMarkAllAdminNotificationsRead: () => ({ mutate: bandeja.markAll }),
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => bandeja.navigate,
}));

import { NotificationBell } from './NotificationBell';

const saved = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'claim_created',
  title: `Aviso ${id}`,
  body: 'Detalle guardado',
  link: { entity: 'claim', id: `claim-${id}` },
  createdAt: '2026-10-28T10:00:00.000Z',
  readAt: null,
  ...over,
});

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
  notifyError.mockReset();
  scope.viewing = null;
  unsubscribed.mockReset();
  bandeja.items = [];
  bandeja.count = 0;
  bandeja.markRead.mockReset();
  bandeja.markAll.mockReset();
  bandeja.navigate.mockReset();
});
afterEach(cleanup);

describe('NotificationBell: incident:created', () => {
  it('un cobro impago avisa con un toast, no agrega ítem local y refresca incidencias, pedidos y reportes', () => {
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
    expect(screen.queryByRole('button', { name: /sin leer/ })).toBeNull();
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey as string[])[0]);
    expect(keys).toEqual(expect.arrayContaining(['incidents', 'orders', 'reports']));
  });

  it('una incidencia de otro tipo avisa con su tipo y refresca sólo las incidencias', () => {
    const spy = setup();
    act(() => {
      handlers.get('incident:created')?.({ incidentId: 'inc-2', orderId: 'bbbbbbbb-2', type: 'damaged' });
    });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Envase dañado'));
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey as string[])[0]);
    expect(keys).toEqual(['incidents']);
    expect(screen.queryByRole('button', { name: /sin leer/ })).toBeNull();
  });
});

describe('NotificationBell: claim:created', () => {
  it('avisa del reclamo con su motivo y refresca los reclamos, sin duplicarlo como ítem local', () => {
    const spy = setup();
    act(() => {
      handlers.get('claim:created')?.({
        claimId: 'c-1',
        orderId: 'cccccccc-3',
        distributorId: 'dist-A',
        reason: 'Fuga de gas',
      });
    });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Fuga de gas'));
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey as string[])[0]);
    expect(keys).toEqual(['claims']);
    expect(screen.queryByRole('button', { name: /sin leer/ })).toBeNull();
  });

  it('ignora el reclamo de otra distribuidora al «ver como»', () => {
    scope.viewing = 'dist-A';
    setup();
    act(() => {
      handlers.get('claim:created')?.({ claimId: 'c-2', orderId: 'dddddddd-4', distributorId: 'dist-B', reason: 'x' });
    });
    expect(notifyInfo).not.toHaveBeenCalled();
  });
});

describe('NotificationBell: order:no-drivers', () => {
  it('ya no agrega un ítem local: el aviso llega guardado por la bandeja', () => {
    setup();
    act(() => {
      handlers.get('order:no-drivers')?.({
        orderId: 'aaaaaaaa-1111',
        distributorId: 'dist-A',
        reason: 'no_drivers_in_range',
        at: '2026-10-15T12:00:00.000Z',
      });
    });
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
    expect(screen.getByRole('button', { name: /1 sin leer/ })).toBeInTheDocument();
  });
});

describe('NotificationBell: cylinder:dispatch-blocked', () => {
  it('avisa con un toast con los seriales y no agrega ítem local', () => {
    setup();
    act(() => {
      handlers.get('cylinder:dispatch-blocked')?.({
        orderId: 'aaaaaaaa-1111',
        distributorId: 'dist-A',
        serials: ['SN-1', 'SN-2'],
      });
    });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('SN-1, SN-2'));
    expect(screen.queryByRole('button', { name: /sin leer/ })).toBeNull();
  });

  it('ignora el de otra distribuidora', () => {
    scope.viewing = 'dist-A';
    setup();
    act(() => {
      handlers.get('cylinder:dispatch-blocked')?.({ orderId: null, distributorId: 'dist-B', serials: ['SN-8'] });
    });
    expect(notifyInfo).not.toHaveBeenCalled();
  });
});

describe('NotificationBell: coverage:no-active-zones', () => {
  it('avisa que la distribuidora se quedó sin zonas activas y refresca las zonas', () => {
    const spy = setup();
    act(() => {
      handlers.get('coverage:no-active-zones')?.({ distributorId: 'd1', zoneIds: ['z1'], at: '2026-10-17T12:00:00Z' });
    });
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey as string[])[0]);
    expect(keys).toContain('coverageZones');
    fireEvent.click(screen.getByRole('button', { name: /1 sin leer/ }));
    expect(screen.getByText('Sin zonas de cobertura activas: no se aceptan pedidos nuevos')).toBeInTheDocument();
  });

  it('ignora el de otra distribuidora', () => {
    scope.viewing = 'd-elegida';
    setup();
    act(() => {
      handlers.get('coverage:no-active-zones')?.({ distributorId: 'otra', zoneIds: ['z1'] });
    });
    expect(screen.queryByRole('button', { name: /sin leer/ })).not.toBeInTheDocument();
  });
});

describe('NotificationBell: order:refund-failed', () => {
  const payload = {
    orderId: 'cccccccc-3333',
    refundId: 'r-1',
    kind: 'full',
    amount: 1500,
    reason: 'MercadoPago rechazó la devolución',
    distributorId: 'd1',
  };

  it('avisa con un toast, no agrega ítem local y refresca Reintegros y el pedido', () => {
    const spy = setup();
    act(() => {
      handlers.get('order:refund-failed')?.(payload);
    });
    expect(notifyError.mock.calls[0]?.[0].message).toContain('Reintegros');
    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey as string[]);
    expect(keys.map((k) => k[0])).toContain('refunds');
    expect(keys).toContainEqual(['orders', 'detail', 'cccccccc-3333']);
    expect(screen.queryByRole('button', { name: /sin leer/ })).toBeNull();
  });

  it('ignora el de otra distribuidora', () => {
    scope.viewing = 'd-elegida';
    setup();
    act(() => {
      handlers.get('order:refund-failed')?.({ ...payload, distributorId: 'otra' });
    });
    expect(notifyError).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sin leer/ })).not.toBeInTheDocument();
  });
});

describe('NotificationBell: order:updated', () => {
  const payload = {
    orderId: 'dddddddd-4444',
    distributorId: 'd1',
    totalAmount: 2500,
    status: 'pending',
  };

  it('avisa con un toast, deja la notificación con el pedido y refresca listados y detalle', () => {
    const spy = setup();
    act(() => {
      handlers.get('order:updated')?.(payload);
    });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('El cliente modificó el pedido'));
    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey as string[]);
    expect(keys.map((k) => k[0])).toContain('orders');
    expect(keys).toContainEqual(['orders', 'detail', 'dddddddd-4444']);
    fireEvent.click(screen.getByRole('button', { name: /1 sin leer/ }));
    expect(screen.getByText('El cliente modificó el pedido')).toBeInTheDocument();
  });

  it('ignora el de otra distribuidora', () => {
    scope.viewing = 'd-elegida';
    setup();
    act(() => {
      handlers.get('order:updated')?.({ ...payload, distributorId: 'otra' });
    });
    expect(notifyInfo).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sin leer/ })).not.toBeInTheDocument();
  });
});

describe('NotificationBell: order:payment-refunded', () => {
  const payload = {
    orderId: 'eeeeeeee-5555',
    refundId: 'r-2',
    kind: 'full',
    amount: 1500,
    at: '2026-10-27T12:00:00.000Z',
    distributorId: 'd1',
  };

  it('avisa con un toast, deja la notificación con el pedido y refresca Reintegros y el pedido', () => {
    const spy = setup();
    act(() => {
      handlers.get('order:payment-refunded')?.(payload);
    });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('Se reintegró el pago'));
    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey as string[]);
    expect(keys.map((k) => k[0])).toContain('refunds');
    expect(keys).toContainEqual(['orders', 'detail', 'eeeeeeee-5555']);
    fireEvent.click(screen.getByRole('button', { name: /1 sin leer/ }));
    expect(screen.getByText('Se reintegró el pago del pedido')).toBeInTheDocument();
  });

  it('ignora el de otra distribuidora', () => {
    scope.viewing = 'd-elegida';
    setup();
    act(() => {
      handlers.get('order:payment-refunded')?.({ ...payload, distributorId: 'otra' });
    });
    expect(notifyInfo).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sin leer/ })).not.toBeInTheDocument();
  });
});

describe('NotificationBell: order:express-degraded', () => {
  const payload = {
    orderId: 'ffffffff-6666',
    surchargeRemoved: 500,
    total: 2000,
    refundRequested: true,
    refundFailed: false,
    message: 'No hay motos disponibles: tu pedido sale por el reparto común, sin el recargo express.',
    distributorId: 'd1',
  };

  it('avisa con un toast, deja la notificación con el pedido y refresca listados y detalle', () => {
    const spy = setup();
    act(() => {
      handlers.get('order:express-degraded')?.(payload);
    });
    expect(notifyInfo).toHaveBeenCalledWith(expect.stringContaining('pasó al reparto común'));
    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey as string[]);
    expect(keys.map((k) => k[0])).toContain('orders');
    expect(keys).toContainEqual(['orders', 'detail', 'ffffffff-6666']);
    fireEvent.click(screen.getByRole('button', { name: /1 sin leer/ }));
    expect(screen.getByText('El pedido express pasó al reparto común')).toBeInTheDocument();
  });

  it('ignora el de otra distribuidora', () => {
    scope.viewing = 'd-elegida';
    setup();
    act(() => {
      handlers.get('order:express-degraded')?.({ ...payload, distributorId: 'otra' });
    });
    expect(notifyInfo).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sin leer/ })).not.toBeInTheDocument();
  });
});

describe('NotificationBell: order:transfer-receipt-uploaded', () => {
  const payload = {
    orderId: 'dddddddd-4444',
    customerId: 'c1',
    attachmentId: 'a1',
    uploadedAt: '2026-10-28T17:00:00.000Z',
    distributorId: 'd1',
  };

  it('refresca el pedido y no agrega ítem local', () => {
    const spy = setup();
    act(() => {
      handlers.get('order:transfer-receipt-uploaded')?.(payload);
    });
    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey as string[]);
    expect(keys).toContainEqual(['orders', 'detail', 'dddddddd-4444']);
    expect(screen.queryByRole('button', { name: /sin leer/ })).toBeNull();
  });

  it('ignora el de otra distribuidora', () => {
    scope.viewing = 'd-elegida';
    setup();
    act(() => {
      handlers.get('order:transfer-receipt-uploaded')?.({ ...payload, distributorId: 'otra' });
    });
    expect(screen.queryByRole('button', { name: /sin leer/ })).not.toBeInTheDocument();
  });
});

describe('NotificationBell: bandeja guardada', () => {
  it('mezcla guardados y de sesión ordenados por fecha, sin duplicar', () => {
    bandeja.items = [saved('a', { createdAt: '2026-10-28T10:00:00.000Z' })];
    bandeja.count = 1;
    setup();
    act(() => {
      handlers.get('order:created')?.({ orderId: 'bbbbbbbb-2', totalAmount: 100 });
      handlers.get('claim:created')?.({ claimId: 'c-9', orderId: 'cccccccc-3', reason: 'x' });
    });
    fireEvent.click(screen.getByRole('button', { name: /2 sin leer/ }));
    const titles = within(screen.getByRole('tabpanel'))
      .getAllByRole('button')
      .map((b) => b.textContent ?? '');
    expect(titles).toHaveLength(2);
    expect(titles[0]).toContain('Nuevo pedido');
    expect(titles[1]).toContain('Aviso a');
    expect(screen.getByText('Detalle guardado')).toBeInTheDocument();
  });

  it('el contador suma los sin leer de la API y los de la sesión', () => {
    bandeja.items = [saved('a')];
    bandeja.count = 3;
    setup();
    act(() => {
      handlers.get('order:created')?.({ orderId: 'bbbbbbbb-2', totalAmount: 100 });
    });
    expect(screen.getByRole('button', { name: /4 sin leer/ })).toBeInTheDocument();
  });

  it('el click en un guardado lo marca leído y navega según su enlace', () => {
    bandeja.items = [saved('a')];
    bandeja.count = 1;
    setup();
    fireEvent.click(screen.getByRole('button', { name: /1 sin leer/ }));
    fireEvent.click(screen.getByText('Aviso a'));
    expect(bandeja.markRead).toHaveBeenCalledWith('a');
    expect(bandeja.navigate).toHaveBeenCalledWith('/claims?claim=claim-a');
  });

  it('un guardado sin enlace se marca leído pero no navega', () => {
    bandeja.items = [saved('b', { link: null, kind: 'algo_nuevo' })];
    bandeja.count = 1;
    setup();
    fireEvent.click(screen.getByRole('button', { name: /1 sin leer/ }));
    fireEvent.click(screen.getByText('Aviso b'));
    expect(bandeja.markRead).toHaveBeenCalledWith('b');
    expect(bandeja.navigate).not.toHaveBeenCalled();
  });

  it('«Marcar todas como leídas» llama a read-all y deja en cero los de la sesión', () => {
    bandeja.count = 0;
    setup();
    act(() => {
      handlers.get('order:created')?.({ orderId: 'bbbbbbbb-2', totalAmount: 100 });
    });
    fireEvent.click(screen.getByRole('button', { name: /1 sin leer/ }));
    fireEvent.click(screen.getByRole('button', { name: /Marcar todas como leídas/ }));
    expect(bandeja.markAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /1 sin leer/ })).toBeNull();
  });

  it('«Ver todas» lleva a /notifications', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }));
    expect(bandeja.navigate).toHaveBeenCalledWith('/notifications');
  });

  it('admin:notification invalida la bandeja; el de otra distribuidora se ignora', () => {
    scope.viewing = 'dist-A';
    const spy = setup();
    act(() => {
      handlers.get('admin:notification')?.({ id: 'n1', kind: 'claim_created', distributorId: 'dist-B' });
    });
    expect(spy).not.toHaveBeenCalled();
    act(() => {
      handlers.get('admin:notification')?.({ id: 'n2', kind: 'claim_created', distributorId: 'dist-A' });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['adminNotifications'] });
  });

  it('al reconectar el socket vuelve a leer la bandeja (pudo llegar algo mientras estaba caído)', () => {
    const spy = setup();
    act(() => {
      handlers.get('connect')?.(undefined);
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['adminNotifications'] });
  });
});
