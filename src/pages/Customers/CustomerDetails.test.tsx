import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Claim, Customer, Order } from '../../services/api/types';

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

const order = (status: Order['status'], total: number, at: string) =>
  ({ order_id: at, status, total_amount: total, created_at: at, order_items: [] }) as unknown as Order;

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

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canManageCustomerAccounts: true,
    canOperate: !perms.needsDistributor,
    needsDistributor: perms.needsDistributor,
    operateHint: undefined,
  }),
}));
const perms = vi.hoisted(() => ({ needsDistributor: false }));
const custo = vi.hoisted(() => ({ consumption: null as number | null, orderTotal: 3 }));
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
    data: { ...CUSTOMER, avgMonthlyConsumptionKg: custo.consumption } as Customer,
    isPending: false,
    error: null,
  }),
  useCustomerOrderSample: () => ({
    data: {
      orders: [
        order('delivered', 1000, '2026-09-01T10:00:00Z'),
        order('delivered', 2500, '2026-09-20T10:00:00Z'),
        order('cancelled', 900, '2026-09-25T10:00:00Z'),
      ],
      total: custo.orderTotal,
    },
  }),
  useCustomerOrders: () => ({ data: { orders: [], total: 0 }, isFetching: false }),
  useDeleteCustomer: () => ({ mutate: vi.fn() }),
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

afterEach(cleanup);
beforeEach(() => {
  perms.needsDistributor = false;
  custo.consumption = null;
  custo.orderTotal = 3;
});
beforeEach(() => accountOf.mockReturnValue({ data: undefined, isPending: true, isError: false, error: null }));

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

  it('avisa que el ticket promedio sale de una muestra cuando hay más pedidos que los traídos', () => {
    custo.orderTotal = 250;
    renderPage();
    expect(screen.getByText('Ticket promedio').closest('div')).toHaveTextContent('De sus últimos 100 pedidos');
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
