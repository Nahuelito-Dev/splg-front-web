import { cleanup, render, screen } from '@testing-library/react';
import { Flame } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';
import { KpiCard, KpiGrid } from './KpiCard';
import { isZeroValue } from './kpiValue';

afterEach(cleanup);

describe('KpiCard', () => {
  it('alto mínimo de 96 px (80 en el celular) y el valor en la letra del sistema con cifras tabulares, no mono', () => {
    const { container } = render(<KpiCard title="Llenas" icon={Flame} value="717" />);
    expect(container.firstElementChild).toHaveClass('min-h-[80px]', 'sm:min-h-[96px]', 'sm:p-4');
    const value = screen.getByText('717');
    expect(value).toHaveClass('tabular-nums', 'sm:text-[28px]', 'font-semibold', 'text-ink');
    expect(value).not.toHaveClass('font-mono');
  });

  it('un valor en cero va apagado; un guion o un número con dato, no', () => {
    const { rerender } = render(<KpiCard title="Cargas" icon={Flame} value="$ 0" />);
    expect(screen.getByText('$ 0')).toHaveClass('text-muted');
    rerender(<KpiCard title="Cargas" icon={Flame} value="$ 1.200" />);
    expect(screen.getByText('$ 1.200')).toHaveClass('text-ink');
    rerender(<KpiCard title="Cargas" icon={Flame} value="—" />);
    expect(screen.getByText('—')).toHaveClass('text-ink');
  });

  it('sin variación ni aclaración no reserva el pie vacío', () => {
    const { container, rerender } = render(<KpiCard title="Llenas" icon={Flame} value="7" />);
    expect((container.firstElementChild as HTMLElement).children).toHaveLength(2);
    rerender(<KpiCard title="Llenas" icon={Flame} value="7" hint="En galpones" />);
    expect((container.firstElementChild as HTMLElement).children).toHaveLength(3);
    expect(screen.getByText('En galpones')).toBeInTheDocument();
  });

  it('el título largo se recorta con el texto completo en el tooltip', () => {
    render(<KpiCard title="Neto en la caja (mismo rango)" icon={Flame} value="1" />);
    expect(screen.getByText('Neto en la caja (mismo rango)')).toHaveAttribute('title', 'Neto en la caja (mismo rango)');
  });
});

describe('isZeroValue', () => {
  it('cifras todas en cero, con o sin moneda, decimales o unidad', () => {
    expect(['0', '$ 0', '$ 0,00', '0 %', '0 L'].map(isZeroValue)).toEqual([true, true, true, true, true]);
    expect(['10', '$ 0,50', '—', '', 'Sin datos'].map(isZeroValue)).toEqual([false, false, false, false, false]);
  });
});

describe('KpiGrid', () => {
  it('de a dos en el celular; las columnas de pantallas anchas las pide la pantalla', () => {
    render(
      <KpiGrid label="Indicadores" className="lg:grid-cols-4">
        <span />
      </KpiGrid>,
    );
    const grid = screen.getByRole('region', { name: 'Indicadores' });
    expect(grid).toHaveClass('grid-cols-2', 'lg:grid-cols-4');
    expect(grid.className).toContain('max-sm:[&>*:last-child:nth-child(odd)]:col-span-2');
    cleanup();
    const { container } = render(<KpiGrid className="sm:grid-cols-3" />);
    expect(container.querySelector('section')).toBeNull();
    expect(container.firstElementChild).toHaveClass('grid-cols-2', 'sm:grid-cols-3');
  });
});
