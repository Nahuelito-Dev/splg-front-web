import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrdersFilters } from './OrdersFilters';
import { isInvertedRange } from './ordersFilterValues';

describe('rango de fechas de Pedidos', () => {
  it('detecta un rango invertido y acepta uno de un solo día', () => {
    expect(isInvertedRange({ from: '2026-09-10', to: '2026-09-01' })).toBe(true);
    expect(isInvertedRange({ from: '2026-09-15', to: '2026-09-15' })).toBe(false);
    expect(isInvertedRange({ from: '2026-09-15', to: '' })).toBe(false);
  });

  it('avisa en «Hasta» cuando queda antes de «Desde»', () => {
    render(<OrdersFilters values={{ search: '', from: '2026-09-10', to: '2026-09-01' }} onChange={vi.fn()} />);
    expect(screen.getByText('Tiene que ser igual o posterior a «Desde»')).toBeInTheDocument();
  });
});
