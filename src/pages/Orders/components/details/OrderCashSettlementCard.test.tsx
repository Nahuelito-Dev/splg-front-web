import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok, renderPage } from '../../../../test/pageTest';

const state = vi.hoisted(() => ({ query: undefined as unknown }));
vi.mock('../../../../services/queries/cashSettings', () => ({ useOrderCashSettlement: () => state.query }));

import { OrderCashSettlementCard } from './OrderCashSettlementCard';

const entry = (over: Record<string, unknown> = {}) => ({
  kind: 'mercadopago',
  amount: 14900,
  collectedAt: '2026-10-30T12:00:00.000Z',
  settled: true,
  movementId: 'm-1',
  cashBoxId: 'c-1',
  cashBoxName: 'Mercado Pago',
  ...over,
});

const render = (entries: unknown[] | 'loading' | 'error') => {
  state.query = entries === 'loading' ? loading() : entries === 'error' ? failed() : ok({ orderId: 'o-1', entries });
  return renderPage(<OrderCashSettlementCard orderId="o-1" />, { url: '/orders/o-1' });
};

afterEach(cleanup);

describe('OrderCashSettlementCard', () => {
  it('un cobro asentado dice a qué caja ingresó y enlaza a ella', () => {
    render([entry()]);
    expect(screen.getByText('Ingresó a Mercado Pago')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la caja' })).toHaveAttribute('href', '/finance/boxes/c-1');
  });

  it('un cobro sin asentar lo dice y lleva a configurar las cajas', () => {
    render([entry({ kind: 'deposit', settled: false, movementId: null, cashBoxId: null, cashBoxName: null })]);
    expect(screen.getByText('Cobrado sin asentar')).toBeInTheDocument();
    expect(screen.getByText(/Seña de la reserva/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurar cajas de cobro' })).toHaveAttribute(
      'href',
      '/finance/collection-settings',
    );
  });

  it('sin cobros todavía, o si la consulta falla, no dibuja nada', () => {
    const { container } = render([]);
    expect(container).toBeEmptyDOMElement();
    cleanup();
    expect(render('error').container).toBeEmptyDOMElement();
  });

  it('mientras carga muestra el título de la tarjeta', () => {
    render('loading');
    expect(screen.getByText('Cobro en caja')).toBeInTheDocument();
  });
});
