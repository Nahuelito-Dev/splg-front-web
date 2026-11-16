import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticSummary, type AnalyticItem } from './AnalyticSummary';
import { shareOf } from './analyticShare';

afterEach(cleanup);

const ITEMS: AnalyticItem[] = [
  { key: 'a', label: 'Pendientes', count: 3, tone: 'warn', amount: '$ 3.000' },
  { key: 'b', label: 'Entregados', count: 1, tone: 'success' },
  { key: 'c', label: 'Cancelados', count: null, tone: 'danger' },
];

describe('AnalyticSummary', () => {
  it('muestra cantidad y monto por estado; sin dato, un guion y nunca 0', () => {
    render(<AnalyticSummary label="Resumen" items={ITEMS} />);
    const list = screen.getByRole('list', { name: 'Resumen' });
    expect(list).toHaveTextContent('Pendientes');
    expect(list).toHaveTextContent('3');
    expect(list).toHaveTextContent('$ 3.000');
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('shareOf: porción del total, 0 sin total ni dato', () => {
    expect(shareOf(1, 4)).toBe(0.25);
    expect(shareOf(null, 4)).toBe(0);
    expect(shareOf(2, 0)).toBe(0);
  });

  it('con onSelect cada estado es un botón que informa su clave y marca el activo', () => {
    const onSelect = vi.fn();
    render(<AnalyticSummary label="Resumen" items={ITEMS} onSelect={onSelect} selected="b" />);
    fireEvent.click(screen.getByRole('button', { name: /Pendientes/ }));
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(screen.getByRole('button', { name: /Entregados/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sin onSelect no hay botones', () => {
    render(<AnalyticSummary label="Resumen" items={ITEMS} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
