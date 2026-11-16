import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatusFilterTabs } from './StatusFilterTabs';

afterEach(cleanup);

const OPTIONS = [
  { value: 'open', label: 'Abiertas' },
  { value: 'closed', label: 'Cerradas' },
];

describe('StatusFilterTabs', () => {
  it('muestra el contador de cada estado y un guion si no hay dato', () => {
    render(
      <StatusFilterTabs
        options={OPTIONS}
        value=""
        onChange={vi.fn()}
        counts={{ all: 7, open: 3 }}
        label="Estado"
        idPrefix="t"
      >
        <p>listado</p>
      </StatusFilterTabs>,
    );
    expect(screen.getByRole('tab', { name: 'Todos 7' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Abiertas 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cerradas –' })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('listado');
  });

  it('elegir un estado avisa su valor y «Todos» avisa vacío', () => {
    const onChange = vi.fn();
    render(
      <StatusFilterTabs options={OPTIONS} value="open" onChange={onChange} counts={{}} label="Estado" idPrefix="t">
        <p>listado</p>
      </StatusFilterTabs>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Cerradas/ }));
    expect(onChange).toHaveBeenLastCalledWith('closed');
    fireEvent.click(screen.getByRole('tab', { name: /Todos/ }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('un valor desconocido (URL vieja) cae en «Todos»', () => {
    render(
      <StatusFilterTabs options={OPTIONS} value="inventado" onChange={vi.fn()} counts={{}} label="Estado" idPrefix="t">
        <p>x</p>
      </StatusFilterTabs>,
    );
    expect(screen.getByRole('tab', { name: /Todos/ })).toHaveAttribute('aria-selected', 'true');
  });
});
