import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import type { Claim, Customer } from '../../services/api/types';

const CUSTOMER = {
  customer_id: 'c-1',
  user_id: 'u-1',
  lat_lang: null,
  createdAt: '2026-06-01T10:00:00Z',
  deletedAt: null,
  user: {
    user_id: 'u-1',
    full_name: 'Ana Pérez',
    email: 'ana@mail.com',
    phone_number: '3764111111',
    blocked: false,
    phone_verified: true,
    email_verified: true,
    createdAt: '2026-06-01T10:00:00Z',
    deletedAt: null,
    role: { type: 'customer' },
  },
} as unknown as Customer;

const claim = (id: string, customerId: string) =>
  ({
    claim_id: id,
    order_id: 'order-1',
    customer_id: customerId,
    status: 'pending',
    reason: `Reclamo ${id}`,
    description: 'x',
    createdAt: '2026-10-01T10:00:00Z',
  }) as unknown as Claim;

vi.mock('../../features/chat/inbox/MessageButton', () => ({ MessageButton: () => null }));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirm: removal.confirm,
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canManageCustomerAccounts: true,
    canOperate: !perms.needsDistributor,
    needsDistributor: perms.needsDistributor,
    operateHint: perms.needsDistributor ? 'Elegí una distribuidora en «Ver como» para operar' : undefined,
  }),
}));
const perms = vi.hoisted(() => ({ needsDistributor: false }));
const removal = vi.hoisted(() => ({ confirm: vi.fn(), mutate: vi.fn() }));
const custo = vi.hoisted(() => ({
  consumption: null as number | null,
  deletedAt: null as string | null,
  stats: undefined as Record<string, unknown> | undefined,
  statsError: false,
}));
const STATS = {
  totalPurchased: 3500,
  ordersCount: 3,
  deliveredCount: 2,
  averageTicket: 1750,
  lastDeliveredAt: '2026-09-20T10:00:00Z',
};
const accountOf = vi.hoisted(() => vi.fn<[], Record<string, unknown>>());
vi.mock('../../services/queries/finance', () => ({
  useCustomerAccountOf: () => accountOf(),
  useCustomerStatement: () => ({
    data: {
      data: [
        {
          entryId: 'e-1',
          type: 'sale_charge',
          orderId: 'order-9',
          description: 'Venta a cuenta',
          signedAmount: 4200,
          occurredAt: '2026-09-20T10:00:00Z',
        },
      ],
      total: 1,
    },
    error: null,
  }),
}));
const repurchaseOf = vi.hoisted(() => vi.fn<unknown[], Record<string, unknown>>());
vi.mock('../../services/queries/repurchase', () => ({
  useCustomerRepurchase: (...args: unknown[]) => repurchaseOf(...args),
}));
// Módulos de la plataforma: por omisión todos habilitados; cada test apaga el que necesita.
const offModules = vi.hoisted(() => new Set<string>());
vi.mock('../../services/queries/modules', () => ({
  useModuleGate: (key: string) => ({ ready: !offModules.has(key), off: offModules.has(key) }),
}));
vi.mock('../../services/queries/photos', () => ({
  useUploadPhoto: () => ({ mutate: vi.fn(), isPending: false }),
  useRemovePhoto: () => ({ mutate: vi.fn(), isPending: false }),
  isSignedPhotoUrl: (url: string | null | undefined) => Boolean(url?.includes('X-Amz-Signature=')),
  useRenewablePhoto: (_kind: string, _id: string, url: string | null | undefined) => ({
    src: url ?? null,
    failed: false,
    none: false,
    renewing: false,
    handleError: vi.fn(),
    renewIfExpired: vi.fn(),
    retry: vi.fn(),
  }),
}));
vi.mock('../../services/queries/customers', () => ({
  useCustomer: () => ({
    data: { ...CUSTOMER, avgMonthlyConsumptionKg: custo.consumption, deletedAt: custo.deletedAt } as Customer,
    isPending: false,
    error: null,
  }),
  useCustomerPurchaseStats: () => ({ data: custo.stats, isError: custo.statsError }),
  useCustomerOrders: () => ({ data: { orders: [], total: 0 }, isFetching: false }),
  useRemoveCustomer: () => ({ mutate: removal.mutate }),
}));
vi.mock('../../services/queries/userAddresses', () => ({
  useUserAddresses: () => ({ data: [{ address_id: 'a-1' }, { address_id: 'a-2' }], isPending: false }),
  useDefaultUserAddress: () => ({ data: undefined, isPending: false, error: null }),
}));
vi.mock('../../services/queries/gasCylinders', () => ({
  useGasCylinderTypes: () => ({ data: { rows: [], total: 0 }, isPending: false }),
}));
vi.mock('../../services/queries/claims', () => {
  const mutation = { mutate: vi.fn(), isPending: false };
  return {
    // Los reclamos traen el id de la cuenta (`user_id`) del cliente en `customer_id`.
    useClaims: () => ({ data: [claim('mine-1', 'u-1'), claim('mine-2', 'u-1'), claim('other', 'u-9')] }),
    useClaim: () => ({ data: undefined }),
    useUpdateClaim: () => mutation,
    useTakeClaim: () => mutation,
    useResolveClaim: () => mutation,
    useReopenClaim: () => mutation,
  };
});
const cylinders = vi.hoisted(() => vi.fn());
vi.mock('../../services/queries/physicalCylinders', () => ({
  useCylinders: (filters: unknown) => {
    cylinders(filters);
    return {
      data: {
        rows: [
          {
            cylinder_id: 'cy-1',
            serial: 'SPLG-00001',
            state: 'with_customer',
            gas_cylinder: { type: 'Garrafa 10kg', weight: 10 },
            lastMovementAt: '2026-09-20T10:00:00Z',
          },
        ],
        total: 1,
      },
      isPending: false,
      error: null,
    };
  },
}));
vi.mock('./components/details/CustomerContainersCard', () => ({
  CustomerContainersCard: ({ customerId }: { customerId: string }) => <p>envases de {customerId}</p>,
}));
vi.mock('./components/details/CustomerRecoveryCard', () => ({
  CustomerRecoveryCard: ({ userId }: { userId: string }) => <p>recupero de {userId}</p>,
}));
vi.mock('../Claims/components/ClaimPhoto', () => ({ ClaimPhoto: () => null }));
vi.mock('./components/CustomerFormModal', () => ({ CustomerFormModal: () => null }));
vi.mock('./components/details/CustomerLocationModal', () => ({ CustomerLocationModal: () => null }));
vi.mock('./components/details/CustomerAddresses', () => ({ CustomerAddresses: () => <p>direcciones del cliente</p> }));
vi.mock('./components/details/CustomerOrders', () => ({ CustomerOrders: () => <p>pedidos del cliente</p> }));
vi.mock('../Ratings/components/UserRatingsTab', () => ({ UserRatingsTab: () => <p>calificaciones</p> }));
vi.mock('../Finance/components/CustomerAccountAction', () => ({
  CustomerAccountAction: () => <button type="button">Habilitar cuenta corriente</button>,
}));
vi.mock('../Claims/components/ClaimHistory', () => ({ ClaimHistory: () => null }));

import { Breadcrumbs } from '../../common/components/Navbar/components/Breadcrumbs';
import { CrumbProvider } from '../../common/components/Navbar/CrumbProvider';
import { CustomerDetails } from './CustomerDetails';
import { notify } from '../../utils/notifications';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  perms.needsDistributor = false;
  custo.consumption = null;
  custo.deletedAt = null;
  custo.stats = STATS;
  custo.statsError = false;
});
beforeEach(() => accountOf.mockReturnValue({ data: undefined, isPending: true, isError: false, error: null }));
const FORECAST = {
  customer: { customerId: 'c-1', userId: 'u-1', fullName: 'Ana Pérez', email: 'ana@mail.com', phoneNumber: null },
  estimatedAt: '2026-11-02T12:00:00.000Z',
  daysLeft: 2,
  source: 'history',
  ordersUsed: 4,
  lastPurchaseAt: '2026-10-20T12:00:00.000Z',
  lastPurchaseKg: 20,
  declaredKgPerMonth: null,
  estimatedKgPerMonth: 45.5,
  usualUnits: 2,
  usualCylinderIds: ['g-1'],
  noticeEnabled: true,
  noticeDays: 3,
  openInvitation: null,
  offsetDays: -2,
  notifyAt: null,
  notifiedAt: null,
};
beforeEach(() =>
  repurchaseOf.mockReturnValue({
    data: { forecast: FORECAST, reason: null },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
);

const renderPage = (url = '/customers/details/c-1') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <CrumbProvider>
        <Breadcrumbs />
        <Routes>
          <Route path="/customers/details/:id" element={<CustomerDetails />} />
        </Routes>
      </CrumbProvider>
    </MemoryRouter>,
  );

describe('CustomerDetails: portada con KPIs y pestañas', () => {
  it('muestra total comprado (sólo entregados), cantidad de pedidos y última compra', () => {
    renderPage();
    expect(screen.getByText('Total comprado').closest('div')).toHaveTextContent('3.500');
    expect(screen.getByText('Pedidos', { selector: 'dt' }).closest('div')).toHaveTextContent('3');
    expect(screen.getByText('Última compra').closest('div')).toHaveTextContent('2026');
  });

  it('la barra muestra Clientes › nombre del cliente, y la página no repite las migas ni tiene botón "volver"', () => {
    renderPage();
    const nav = screen.getByRole('navigation', { name: 'Migas de pan' });
    expect(within(nav).getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/customers');
    expect(within(nav).getByText('Ana Pérez')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByText('Detalle')).not.toBeInTheDocument();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Volver/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('las pestañas traen su contador y cada una muestra su contenido', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Direcciones\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Reclamos\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Envases en su poder\s*1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Direcciones/ }));
    expect(screen.getByText('direcciones del cliente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Calificaciones/ }));
    expect(screen.getByText('calificaciones')).toBeInTheDocument();
  });

  it('la pestaña Envases en su poder lista las series del cliente (por su user_id) con enlace a la ficha', () => {
    renderPage('/customers/details/c-1?tab=cylinders');
    expect(cylinders).toHaveBeenCalledWith({ customerUserId: 'u-1' });
    expect(screen.getByRole('link', { name: 'SPLG-00001' })).toHaveAttribute('href', '/physical-cylinders/cy-1');
    expect(screen.getByText('Garrafa 10kg · 10 kg')).toBeInTheDocument();
  });

  it('la pestaña Envases en su poder muestra la tarjeta de envases propios con el id de la ficha', () => {
    renderPage('/customers/details/c-1?tab=cylinders');
    expect(screen.getByText('envases de c-1')).toBeInTheDocument();
  });

  it('sin distribuidora elegida no muestra la tarjeta de envases propios', () => {
    perms.needsDistributor = true;
    renderPage('/customers/details/c-1?tab=cylinders');
    expect(screen.queryByText('envases de c-1')).not.toBeInTheDocument();
  });

  it('la pestaña Envases en su poder suma los casos de recupero del cliente', () => {
    renderPage('/customers/details/c-1?tab=cylinders');
    expect(screen.getByText('recupero de u-1')).toBeInTheDocument();
  });

  it('la pestaña Reclamos lista sólo los de este cliente y abre el detalle en un panel lateral', () => {
    renderPage('/customers/details/c-1?tab=claims');
    expect(screen.getByText('Reclamo mine-1')).toBeInTheDocument();
    expect(screen.getByText('Reclamo mine-2')).toBeInTheDocument();
    expect(screen.queryByText('Reclamo other')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Reclamo mine-1'));
    expect(screen.getByRole('dialog', { name: 'Gestionar reclamo' })).toHaveAttribute('aria-modal', 'true');
  });

  it('suma a la portada el ticket promedio, el consumo declarado y el saldo de la cuenta corriente', () => {
    accountOf.mockReturnValue({
      data: {
        accountId: 'acc-1',
        balance: 4200,
        availableCredit: 5800,
        creditLimit: 10000,
        pendingOrdersAmount: 0,
        overdueAmount: 0,
        status: 'active',
      },
      isPending: false,
      isError: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText('Ticket promedio').closest('div')).toHaveTextContent('1.750');
    expect(screen.getAllByText('Consumo declarado')[0].closest('div')).toHaveTextContent('Sin declarar');
    expect(screen.getByText('Cuenta corriente', { selector: 'dt' }).closest('div')).toHaveTextContent('4.200');
  });

  it('la pestaña Cuenta corriente muestra el crédito y los últimos asientos, con enlace al pedido', () => {
    accountOf.mockReturnValue({
      data: {
        accountId: 'acc-1',
        balance: 4200,
        availableCredit: -100,
        creditLimit: 4000,
        pendingOrdersAmount: 0,
        overdueAmount: 300,
        status: 'active',
      },
      isPending: false,
      isError: false,
      error: null,
    });
    renderPage('/customers/details/c-1?tab=account');
    expect(screen.getByText('Se pasó del límite')).toBeInTheDocument();
    expect(screen.getByText('Reclamar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#RDER-9' })).toHaveAttribute('href', '/orders/order-9');
    expect(screen.getByText(/Venta a cuenta/)).toBeInTheDocument();
  });

  it('sin cuenta corriente la pestaña ofrece habilitarla en lugar de mostrar ceros', () => {
    accountOf.mockReturnValue({ data: null, isPending: false, isError: false, error: null });
    renderPage('/customers/details/c-1?tab=account');
    expect(screen.getByText('Sin cuenta corriente')).toBeInTheDocument();
    expect(
      within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Habilitar cuenta corriente' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cuenta corriente', { selector: 'dt' }).closest('div')).toHaveTextContent('Sin cuenta');
  });

  it('el ticket promedio y el saldo se muestran con centavos', () => {
    accountOf.mockReturnValue({
      data: {
        accountId: 'a',
        balance: 1234.5,
        availableCredit: 0,
        creditLimit: 0,
        pendingOrdersAmount: 0,
        overdueAmount: 0,
        status: 'active',
      },
      isPending: false,
      isError: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText('Ticket promedio').closest('div')).toHaveTextContent('1.750,00');
    expect(screen.getByText('Cuenta corriente', { selector: 'dt' }).closest('div')).toHaveTextContent('1.234,50');
  });

  it('un saldo de fracciones de centavo no dice que el cliente debe', () => {
    accountOf.mockReturnValue({
      data: {
        accountId: 'a',
        balance: 0.004,
        availableCredit: 0,
        creditLimit: 0,
        pendingOrdersAmount: 0,
        overdueAmount: 0,
        status: 'active',
      },
      isPending: false,
      isError: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText('Cuenta corriente', { selector: 'dt' }).closest('div')).toHaveTextContent('Al día');
  });

  it('el consumo declarado se muestra en kg por mes', () => {
    custo.consumption = 12;
    renderPage();
    expect(screen.getAllByText('Consumo declarado')[0].closest('div')).toHaveTextContent('12 kg/mes');
  });

  it('muestra lo que calcula el back, también con cientos de pedidos, sin avisar de muestras', () => {
    custo.stats = { ...STATS, totalPurchased: 720800, ordersCount: 175, deliveredCount: 20, averageTicket: 36040 };
    renderPage();
    expect(screen.getByText('Total comprado').closest('div')).toHaveTextContent('720.800');
    expect(screen.getByText('Pedidos', { selector: 'dt' }).closest('div')).toHaveTextContent('175');
    expect(screen.getByText('Ticket promedio').closest('div')).toHaveTextContent('36.040');
    expect(screen.queryByText(/últimos 100 pedidos/)).not.toBeInTheDocument();
  });

  it('un cliente sin entregas no tiene ticket promedio ni última compra', () => {
    custo.stats = {
      ...STATS,
      totalPurchased: 0,
      ordersCount: 2,
      deliveredCount: 0,
      averageTicket: null,
      lastDeliveredAt: null,
    };
    renderPage();
    expect(screen.getByText('Ticket promedio').closest('div')).toHaveTextContent('Sin entregas');
    expect(screen.getByText('Última compra').closest('div')).toHaveTextContent('Sin entregas');
  });

  it('si falla la carga de las estadísticas lo dice, no deja un guion mudo', () => {
    custo.stats = undefined;
    custo.statsError = true;
    renderPage();
    expect(screen.getByText('Total comprado').closest('div')).toHaveTextContent('No disponible');
    expect(screen.getByText('Total comprado').closest('div')).toHaveTextContent('No se pudieron cargar');
  });

  it('con pedidos pero sin entregas, la última compra dice «Sin entregas»', () => {
    custo.stats = {
      ...STATS,
      totalPurchased: 0,
      ordersCount: 2,
      deliveredCount: 0,
      averageTicket: null,
      lastDeliveredAt: null,
    };
    renderPage();
    expect(screen.getByText('Última compra').closest('div')).toHaveTextContent('Sin entregas');
  });

  it('un cliente sin ningún pedido dice «Sin pedidos»', () => {
    custo.stats = {
      ...STATS,
      totalPurchased: 0,
      ordersCount: 0,
      deliveredCount: 0,
      averageTicket: null,
      lastDeliveredAt: null,
    };
    renderPage();
    expect(screen.getByText('Última compra').closest('div')).toHaveTextContent('Sin pedidos');
  });

  it('mientras el back no contesta, los KPIs quedan en blanco: no se inventan números', () => {
    custo.stats = undefined;
    renderPage();
    expect(screen.getByText('Total comprado').closest('div')).toHaveTextContent('–');
    expect(screen.getByText('Ticket promedio').closest('div')).toHaveTextContent('–');
  });

  it('el administrador general sin distribuidora no ve la cuenta corriente: pide «Ver como»', () => {
    perms.needsDistributor = true;
    renderPage('/customers/details/c-1?tab=account');
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.getByText('Cuenta corriente', { selector: 'dt' }).closest('div')).toHaveTextContent(
      'Elegí distribuidora',
    );
  });
});

describe('CustomerDetails: recompra estimada', () => {
  it('la portada muestra cuándo se le acaba el gas y la pestaña Recompra explica de dónde sale', () => {
    renderPage();
    expect(screen.getByText('Próxima recompra').closest('div')).toHaveTextContent('2026');
    expect(screen.getByText('Próxima recompra').closest('div')).toHaveTextContent('En 2 días');
    fireEvent.click(screen.getByRole('tab', { name: 'Recompra' }));
    expect(screen.getByRole('heading', { name: /Se le acaba el gas el/ })).toBeInTheDocument();
    expect(screen.getByText('Sus compras')).toBeInTheDocument();
    expect(screen.getByText('3 días antes')).toBeInTheDocument();
    expect(screen.getByText('−2 días respecto del promedio')).toBeInTheDocument();
  });

  it('sin fecha estimada la pestaña dice por qué', () => {
    repurchaseOf.mockReturnValue({
      data: { forecast: null, reason: 'insufficient_history' },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage('/customers/details/c-1?tab=repurchase');
    expect(screen.getByText('Sin fecha estimada')).toBeInTheDocument();
    expect(screen.getByText(/pocas compras y no declaró cuánto consume/)).toBeInTheDocument();
    expect(screen.getByText('Próxima recompra').closest('div')).toHaveTextContent('Sin estimar');
  });

  it('el administrador general sin distribuidora pide «Ver como»', () => {
    perms.needsDistributor = true;
    renderPage('/customers/details/c-1?tab=repurchase');
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.getByText('Próxima recompra').closest('div')).toHaveTextContent('Elegí distribuidora');
  });

  it('una cuenta bloqueada se explica con un estado vacío y no consulta al back', () => {
    const original = CUSTOMER.user as object;
    (CUSTOMER as unknown as { user: object }).user = { ...original, blocked: true };
    try {
      renderPage('/customers/details/c-1?tab=repurchase');
      expect(screen.getByText('Sin recompra estimada')).toBeInTheDocument();
      expect(screen.getByText(/La cuenta está bloqueada/)).toBeInTheDocument();
      expect(screen.getByText('Próxima recompra').closest('div')).toHaveTextContent('No aplica');
      expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument();
    } finally {
      (CUSTOMER as unknown as { user: object }).user = original;
    }
  });

  it('un cliente dado de baja se explica con un estado vacío', () => {
    custo.deletedAt = '2026-10-01T10:00:00Z';
    renderPage('/customers/details/c-1?tab=repurchase');
    expect(screen.getByText(/está dado de baja/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument();
  });

  it('si el back no lo tiene como cliente de la distribuidora (404) lo explica en vez de mostrar un error', () => {
    repurchaseOf.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(404, ['Cliente no encontrado']),
      refetch: vi.fn(),
    });
    renderPage('/customers/details/c-1?tab=repurchase');
    expect(screen.getByText(/no figura entre los clientes activos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument();
  });

  it('si la consulta falla ofrece reintentar', () => {
    const refetch = vi.fn();
    repurchaseOf.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('boom'),
      refetch,
    });
    renderPage('/customers/details/c-1?tab=repurchase');
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga muestra el esqueleto', () => {
    repurchaseOf.mockReturnValue({ data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() });
    renderPage('/customers/details/c-1?tab=repurchase');
    expect(screen.queryByText('Sin fecha estimada')).not.toBeInTheDocument();
    expect(screen.getByText('Próxima recompra').closest('div')).toHaveTextContent('–');
  });
});

describe('CustomerDetails: baja en la distribuidora', () => {
  it('pide confirmación aclarando que es de esta distribuidora y da de baja con la ruta de la distribuidora', async () => {
    removal.confirm.mockResolvedValue(true);
    removal.mutate.mockImplementation((_id: string, options: { onSuccess: () => void }) => options.onSuccess());
    const success = vi.spyOn(notify, 'success').mockImplementation(() => 'x');
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(removal.mutate).toHaveBeenCalledWith('c-1', expect.anything()));
    expect(removal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('de esta distribuidora') as string, danger: true }),
    );
    expect(success).toHaveBeenCalledWith('Cliente dado de baja');
  });

  it('si el back rechaza con 409 muestra su mensaje tal cual', async () => {
    removal.confirm.mockResolvedValue(true);
    const conflict = new Error('El cliente tiene pedidos en curso');
    removal.mutate.mockImplementation((_id: string, options: { onError: (error: unknown) => void }) =>
      options.onError(conflict),
    );
    const failure = vi.spyOn(notify, 'error').mockImplementation(() => 'x');
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(failure).toHaveBeenCalledWith(conflict));
  });

  it('si se cancela no se da de baja', async () => {
    removal.confirm.mockResolvedValue(false);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(removal.confirm).toHaveBeenCalled());
    expect(removal.mutate).not.toHaveBeenCalled();
  });

  it('el administrador general sin distribuidora tiene la baja bloqueada con el motivo', () => {
    perms.needsDistributor = true;
    renderPage();
    const button = screen.getByRole('button', { name: 'Dar de baja' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', expect.stringContaining('Ver como') as string);
    fireEvent.click(button);
    expect(removal.confirm).not.toHaveBeenCalled();
  });
});

describe('CustomerDetails: módulos que la plataforma no le habilitó a la empresa', () => {
  afterEach(() => offModules.clear());

  it('con la recompra apagada no hay pestaña, ni dato en la portada, ni consulta al back', () => {
    offModules.add('repurchase');
    renderPage();
    expect(screen.queryByRole('tab', { name: 'Recompra' })).not.toBeInTheDocument();
    expect(screen.queryByText('Próxima recompra')).not.toBeInTheDocument();
    expect(repurchaseOf).toHaveBeenCalledWith('u-1', { enabled: false });
  });

  it('por URL a la pestaña de recompra apagada cae en el resumen', () => {
    offModules.add('repurchase');
    renderPage('/customers/details/c-1?tab=repurchase');
    expect(screen.queryByText('Sin recompra estimada')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resumen', selected: true })).toBeInTheDocument();
  });

  it('con el recupero de envases apagado la tarjeta de casos no se monta (ni pide)', () => {
    offModules.add('cylinder_recovery');
    renderPage('/customers/details/c-1?tab=cylinders');
    expect(screen.queryByText('recupero de u-1')).not.toBeInTheDocument();
  });

  it('con los módulos habilitados todo sigue como siempre', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Recompra' })).toBeInTheDocument();
    expect(repurchaseOf).toHaveBeenCalledWith('u-1', { enabled: true });
  });
});
