import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useScrollHint } from './useScrollHint';

afterEach(cleanup);

/** jsdom no maqueta: las medidas de desplazamiento se fijan a mano. */
const measure = (el: HTMLElement, sizes: Partial<Record<'scrollHeight' | 'clientHeight' | 'scrollTop', number>>) => {
  Object.entries(sizes).forEach(([key, value]) => {
    Object.defineProperty(el, key, { configurable: true, writable: true, value });
  });
};

const Probe = () => {
  const { ref, more } = useScrollHint<HTMLDivElement>('y');
  return (
    <div ref={ref} data-testid="zone" data-more={String(more)}>
      contenido
    </div>
  );
};

describe('useScrollHint', () => {
  it('avisa si queda contenido abajo y deja de avisar al llegar al final', () => {
    render(<Probe />);
    const zone = screen.getByTestId('zone');
    expect(zone).toHaveAttribute('data-more', 'false');
    measure(zone, { scrollHeight: 900, clientHeight: 600, scrollTop: 0 });
    fireEvent.scroll(zone);
    expect(zone).toHaveAttribute('data-more', 'true');
    measure(zone, { scrollTop: 300 });
    fireEvent.scroll(zone);
    expect(zone).toHaveAttribute('data-more', 'false');
  });

  it('se recalcula al cambiar el tamaño de la ventana', () => {
    render(<Probe />);
    const zone = screen.getByTestId('zone');
    measure(zone, { scrollHeight: 900, clientHeight: 600, scrollTop: 0 });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(zone).toHaveAttribute('data-more', 'true');
  });
});
