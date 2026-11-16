import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);
import { Tabs, tabPanelProps, type TabItem } from './index';

const ITEMS: TabItem[] = [
  { id: 'a', label: 'Uno', count: 3, tone: 'success' },
  { id: 'b', label: 'Dos', count: null },
  { id: 'c', label: 'Tres' },
];

const Harness = () => {
  const [value, setValue] = useState('a');
  return (
    <>
      <Tabs items={ITEMS} value={value} onChange={setValue} label="Prueba" idPrefix="t" />
      <div {...tabPanelProps('t', value)}>panel {value}</div>
    </>
  );
};

describe('Tabs', () => {
  it('sin dato muestra un guion, nunca 0, y sin contador no muestra nada', () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Uno 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Dos –' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tres' })).toBeInTheDocument();
  });

  it('tabindex itinerante y navegación con flechas, Inicio y Fin', () => {
    render(<Harness />);
    const [a, b, c] = screen.getAllByRole('tab');
    expect(a).toHaveAttribute('tabindex', '0');
    expect(b).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(a, { key: 'ArrowRight' });
    expect(b).toHaveAttribute('aria-selected', 'true');
    expect(b).toHaveFocus();

    fireEvent.keyDown(b, { key: 'End' });
    expect(c).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(c, { key: 'ArrowRight' });
    expect(a).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(a, { key: 'ArrowLeft' });
    expect(c).toHaveFocus();
  });

  it('el panel queda asociado a la pestaña activa', () => {
    render(<Harness />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', screen.getByRole('tab', { name: 'Uno 3' }).id);
    fireEvent.click(screen.getByRole('tab', { name: 'Dos –' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      screen.getByRole('tab', { name: 'Dos –' }).id,
    );
  });

  it('si no entran, un degradé avisa de qué lado hay más pestañas', () => {
    const sizes = { scrollWidth: 500, clientWidth: 200 };
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.getAttribute('role') === 'tablist' ? sizes.scrollWidth : 0;
    });
    const client = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.getAttribute('role') === 'tablist' ? sizes.clientWidth : 0;
    });
    try {
      render(<Harness />);
      expect(screen.getByTestId('tabs-fade-end')).toBeInTheDocument();
      expect(screen.queryByTestId('tabs-fade-start')).not.toBeInTheDocument();

      const list = screen.getByRole('tablist');
      list.scrollLeft = 300;
      fireEvent.scroll(list);
      expect(screen.getByTestId('tabs-fade-start')).toBeInTheDocument();
      expect(screen.queryByTestId('tabs-fade-end')).not.toBeInTheDocument();
    } finally {
      scroll.mockRestore();
      client.mockRestore();
    }
  });

  it('si entran, no hay degradé', () => {
    render(<Harness />);
    expect(screen.queryByTestId('tabs-fade-end')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tabs-fade-start')).not.toBeInTheDocument();
  });
});
