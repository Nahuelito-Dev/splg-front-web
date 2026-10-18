import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../test/pageTest';
import { Refunds } from './Refunds';

const state = vi.hoisted(() => ({
  list: undefined as unknown,
  retry: undefined as unknown,
  perms: { canOperate: true, operateHint: undefined as string | undefined },
  filters: [] as unknown[],
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigate,
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => state.perms,
}));
vi.mock('../../services/queries/refunds', () => ({
  useRefunds: (_params: unknown, filters: unknown) => {
    state.filters.push(filters);
    return state.list;
  },
  useRetryOrderRefunds: () => state.retry,
}));
vi.mock('../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const refund = (over: Record<string, unknown> = {}) => ({
  refundId: 'r-1',
  orderId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeabc123',
  paymentId: 'p-1',
  kind: 'full',
  amount: 3000,
  status: 'failed',
  gatewayRefundId: null,
  errorMessage: 'MP caído',
  attempts: 1,
  refundedAt: null,
  createdAt: '2026-10-17T12:00:00.000Z',
  updatedAt: '2026-10-17T12:00:00.000Z',
  ...over,
});

const setup = (rows = [refund()]) => {
  state.list = ok({ items: rows, total: rows.length, limit: 10, offset: 0 });
  state.retry = mutation();
  render(
    <MemoryRouter>
      <Refunds />
    </MemoryRouter>,
  );
  return state.retry as ReturnType<typeof mutation>;
};

const originalMatchMedia = window.matchMedia;
/** El listado se dibuja como tarjetas en pantallas angostas: en jsdom la grilla no pinta filas. */
const narrow = () => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width'),
    media: query,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

beforeEach(narrow);

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  cleanup();
  state.filters = [];
  state.perms = { canOperate: true, operateHint: undefined };
  navigate.mockReset();
});

describe('Refunds', () => {
  it('por omisión pide las pendientes (failed) y muestra el error de la pasarela', () => {
    setup();
    expect(state.filters[0]).toEqual({ status: 'failed' });
    expect(screen.getAllByText('MP caído').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#ABC123').length).toBeGreaterThan(0);
  });

  it('«Reintentar» reintenta el pedido de esa devolución', () => {
    const retry = setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);
    expect(retry.mutate.mock.calls[0][0]).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeabc123');
  });

  it('lo ya reintegrado no tiene botón de reintento', () => {
    setup([refund({ status: 'succeeded', errorMessage: null })]);
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('sin pendientes muestra el vacío', () => {
    setup([]);
    expect(screen.getByText('No hay reintegros pendientes')).toBeInTheDocument();
  });

  it('el administrador general sin distribuidora ve el reintento bloqueado con su motivo', () => {
    state.perms = { canOperate: false, operateHint: 'Elegí una distribuidora' };
    setup();
    expect(screen.getAllByRole('button', { name: 'Reintentar' })[0]).toHaveAttribute('aria-disabled', 'true');
  });
});
