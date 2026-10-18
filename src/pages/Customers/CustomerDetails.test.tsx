import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  usePermissions: () => ({ canManageCustomerAccounts: true, canOperate: true, operateHint: undefined }),
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
  useCustomer: () => ({ data: CUSTOMER, isPending: false, error: null }),
  useCustomerOrderSample: () => ({
    data: {
      orders: [
        order('delivered', 1000, '2026-09-01T10:00:00Z'),
        order('delivered', 2500, '2026-09-20T10:00:00Z'),
        order('cancelled', 900, '2026-09-25T10:00:00Z'),
      ],
      total: 3,
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
vi.mock('../Claims/components/ClaimHistory', () => ({ ClaimHistory: () => null }));

import { Breadcrumbs } from '../../common/components/Navbar/components/Breadcrumbs';
import { CrumbProvider } from '../../common/components/Navbar/CrumbProvider';
import { CustomerDetails } from './CustomerDetails';

afterEach(cleanup);

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
});
