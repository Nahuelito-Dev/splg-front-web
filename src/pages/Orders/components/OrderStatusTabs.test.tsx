import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);
import type { Order } from '../../../services/api/types';
import { OrderStatusTabs } from './OrderStatusTabs';

const COUNTS: Record<Order['status'], number | null> = {
  reserved: 1,
  pending: 2,
  accepted: 3,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: 6,
};

describe('OrderStatusTabs', () => {
  it('muestra los conteos y el total', () => {
    render(<OrderStatusTabs value="" counts={COUNTS} total={21} onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Todos 21' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Pendiente 2' })).toBeInTheDocument();
  });

  it('mientras falta un dato (cargando o con error) no inventa ceros: guion y "Todos" sin número', () => {
    render(<OrderStatusTabs value="" counts={{ ...COUNTS, pending: null }} total={null} onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Pendiente –' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Todos –' })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('elegir un estado lo informa y "Todos" vuelve a vacío', () => {
    const onChange = vi.fn();
    render(<OrderStatusTabs value="pending" counts={COUNTS} total={21} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Entregado 5' }));
    expect(onChange).toHaveBeenLastCalledWith('delivered');
    fireEvent.click(screen.getByRole('tab', { name: 'Todos 21' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
