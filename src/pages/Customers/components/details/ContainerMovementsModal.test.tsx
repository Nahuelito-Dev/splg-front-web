import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok, renderPage } from '../../../../test/pageTest';

const movements = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/queries/customerContainers', () => ({
  useCustomerContainerMovements: (...args: unknown[]) => movements(...args) as unknown,
}));

import { ContainerMovementsModal, MOVEMENTS_PAGE_SIZE } from './ContainerMovementsModal';

const movement = (over: Record<string, unknown>) => ({
  movementId: 'm-1',
  gasCylinderId: 'g-10',
  type: '10kg',
  quantity: 2,
  reason: 'initial_from_deliveries',
  orderId: null,
  note: null,
  actorUserId: null,
  createdAt: '2026-11-07T15:00:00.000Z',
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const draw = () => renderPage(<ContainerMovementsModal open onClose={vi.fn()} customerId="c-1" />);
const lastPage = () => (movements.mock.calls.at(-1) as unknown[])[1];

describe('ContainerMovementsModal', () => {
  it('muestra cada motivo legible, la cantidad con signo y la nota', () => {
    movements.mockReturnValue(
      ok({
        items: [
          movement({ movementId: 'm-4', reason: 'returned', quantity: -1, note: 'Devolvió un envase en el local' }),
          movement({ movementId: 'm-3', reason: 'manual_adjustment', quantity: 3, note: 'Conteo en el domicilio' }),
          movement({ movementId: 'm-2', reason: 'purchased', quantity: 1, orderId: 'order-abcdef' }),
          movement({ movementId: 'm-1' }),
        ],
        total: 4,
        limit: MOVEMENTS_PAGE_SIZE,
        offset: 0,
      }),
    );
    draw();
    expect(movements).toHaveBeenCalledWith('c-1', { page: 0, pageSize: MOVEMENTS_PAGE_SIZE }, { enabled: true });
    expect(screen.getByText('10kg · Devolución')).toBeInTheDocument();
    expect(screen.getByText('10kg · Ajuste manual')).toBeInTheDocument();
    expect(screen.getByText('10kg · Compra de envase')).toBeInTheDocument();
    expect(screen.getByText('10kg · Saldo inicial por entregas')).toBeInTheDocument();
    expect(screen.getByText('−1')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('Conteo en el domicilio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedido #ABCDEF' })).toHaveAttribute('href', '/orders/order-abcdef');
  });

  it('pagina contra el back: «Siguientes» pide la otra página y en la última se apaga', () => {
    const firstPage = Array.from({ length: MOVEMENTS_PAGE_SIZE }, (_, i) => movement({ movementId: `m-${i}` }));
    movements.mockReturnValue(ok({ items: firstPage, total: MOVEMENTS_PAGE_SIZE + 1, limit: 10, offset: 0 }));
    draw();
    expect(screen.getByText(`1–${MOVEMENTS_PAGE_SIZE} de ${MOVEMENTS_PAGE_SIZE + 1}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anteriores' })).toBeDisabled();

    movements.mockReturnValue(
      ok({ items: [movement({ movementId: 'm-last' })], total: MOVEMENTS_PAGE_SIZE + 1, limit: 10, offset: 10 }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Siguientes' }));
    expect(lastPage()).toEqual({ page: 1, pageSize: MOVEMENTS_PAGE_SIZE });
    expect(screen.getByRole('button', { name: 'Siguientes' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Anteriores' }));
    expect(lastPage()).toEqual({ page: 0, pageSize: MOVEMENTS_PAGE_SIZE });
  });

  it('mientras llega la página nueva, el rango es el de los movimientos que se ven y no se puede volver a paginar', () => {
    const firstPage = Array.from({ length: MOVEMENTS_PAGE_SIZE }, (_, i) => movement({ movementId: `m-${i}` }));
    const shown = { items: firstPage, total: MOVEMENTS_PAGE_SIZE + 1, limit: 10, offset: 0 };
    movements.mockReturnValue(ok(shown));
    draw();
    // keepPreviousData: pidió la página 1 pero siguen a la vista los de la 0.
    movements.mockReturnValue(ok(shown, { isPlaceholderData: true, isFetching: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguientes' }));
    expect(lastPage()).toEqual({ page: 1, pageSize: MOVEMENTS_PAGE_SIZE });
    expect(screen.getByText(`1–${MOVEMENTS_PAGE_SIZE} de ${MOVEMENTS_PAGE_SIZE + 1} · Cargando…`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguientes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anteriores' })).toBeDisabled();
  });

  it('sin movimientos lo dice', () => {
    movements.mockReturnValue(ok({ items: [], total: 0, limit: 10, offset: 0 }));
    draw();
    expect(screen.getByText('Sin movimientos')).toBeInTheDocument();
  });

  it('mientras carga no muestra el vacío', () => {
    movements.mockReturnValue(loading());
    draw();
    expect(screen.queryByText('Sin movimientos')).not.toBeInTheDocument();
  });

  it('un error se dice y permite reintentar', () => {
    const refetch = vi.fn();
    movements.mockReturnValue(failed(refetch));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
