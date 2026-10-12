import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrdersFilters } from './OrdersFilters';
import { isInvertedRange } from './ordersFilterValues';

afterEach(cleanup);

describe('rango de fechas de Pedidos', () => {
  it('detecta un rango invertido y acepta uno de un solo día', () => {
    expect(isInvertedRange({ from: '2026-09-10', to: '2026-09-01' })).toBe(true);
    expect(isInvertedRange({ from: '2026-09-15', to: '2026-09-15' })).toBe(false);
    expect(isInvertedRange({ from: '2026-09-15', to: '' })).toBe(false);
  });

  it('avisa en «Hasta» cuando queda antes de «Desde»', () => {
    render(
      <OrdersFilters values={{ search: '', payment: '', from: '2026-09-10', to: '2026-09-01' }} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Tiene que ser igual o posterior a «Desde»')).toBeInTheDocument();
  });
});

describe('filtro por estado de cobro', () => {
  const base = { search: '', payment: '' as const, from: '', to: '' };

  it('ofrece todos los estados de cobro en castellano', () => {
    render(<OrdersFilters values={base} onChange={vi.fn()} />);
    const select = screen.getByLabelText('Cobro');
    expect(Array.from((select as HTMLSelectElement).options).map((o) => o.text)).toEqual([
      'Todos los cobros',
      'Pendiente',
      'Cobrado',
      'Impago',
      'Pérdida',
      'Rechazado',
    ]);
  });

  it('elegir un estado lo manda sin tocar el resto de los filtros', () => {
    const onChange = vi.fn();
    render(<OrdersFilters values={{ ...base, search: 'ana' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Cobro'), { target: { value: 'unpaid' } });
    expect(onChange).toHaveBeenCalledWith({ ...base, search: 'ana', payment: 'unpaid' });
  });
});
